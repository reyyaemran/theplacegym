import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Membership } from "@/features/dashboard/pages/memberships/types/membership";
import { mockMemberships } from "@/features/dashboard/pages/memberships/data/mock-memberships";
import { logger } from "@/lib/logger";
import { membershipTypeSchema } from "@/lib/validations/membership-type";

interface MembershipQuery {
  search?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let memberships: Membership[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection<Membership>("membership-types");

      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get("search");
      const status = searchParams.get("status");

      const query: MembershipQuery = {};
      if (status && status !== "all") {
        query.status = status;
      }

      memberships = await collection.find(query as any).sort({ duration: 1 }).toArray();

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        memberships = memberships.filter((membership) => {
          const searchableFields = [
            membership.name,
            membership.shortName,
            membership.description || "",
            membership.type,
          ].map((field) => field.toLowerCase());

          return searchableFields.some((field) => field.includes(searchLower));
        });
      }

      // Apply status filter
      if (status === "active") {
        memberships = memberships.filter((membership) => membership.isActive);
      } else if (status === "inactive") {
        memberships = memberships.filter((membership) => !membership.isActive);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock memberships data (MongoDB not configured)");
        memberships = [...mockMemberships];

        // Apply filters to mock data
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search");
        const status = searchParams.get("status");

        if (status === "active") {
          memberships = memberships.filter((m) => m.isActive);
        } else if (status === "inactive") {
          memberships = memberships.filter((m) => !m.isActive);
        }

        if (search) {
          const searchLower = search.toLowerCase();
          memberships = memberships.filter((membership) => {
            const searchableFields = [
              membership.name,
              membership.shortName,
              membership.description || "",
              membership.type,
            ].map((field) => field.toLowerCase());

            return searchableFields.some((field) => field.includes(searchLower));
          });
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json(memberships);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching memberships", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/package-types/memberships",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch memberships" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = membershipTypeSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid membership data submitted", {
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const membership: Omit<Membership, "id"> = {
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = await getDatabase();
      const collection = db.collection<Membership>("membership-types");
      const membershipWithId: Membership = {
        id: `m${Date.now()}`,
        ...membership,
      };
      const result = await collection.insertOne(membershipWithId as any);
      const createdMembership: Membership = {
        ...membershipWithId,
        id: result.insertedId.toString(),
      };
      return NextResponse.json(createdMembership, { status: 201 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock mode for membership creation");
        const mockMembership: Membership = {
          id: `m${Date.now()}`,
          ...membership,
        };
        return NextResponse.json(mockMembership, { status: 201 });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating membership",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/package-types/memberships",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create membership" },
      { status: 500 }
    );
  }
}

