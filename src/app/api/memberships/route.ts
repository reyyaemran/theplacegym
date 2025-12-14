import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { mockMembershipRecords } from "@/features/dashboard/pages/membership-invoice/data/mock-membership-records";
import { logger } from "@/lib/logger";
import { membershipRecordSchema } from "@/lib/validations/membership-record";

interface MembershipQuery {
  memberId?: string;
  memberName?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let records: MembershipRecord[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection<MembershipRecord>("memberships");

      const searchParams = request.nextUrl.searchParams;
      const memberId = searchParams.get("memberId");
      const memberName = searchParams.get("memberName");

      const query: MembershipQuery = {};
      if (memberId) query.memberId = memberId;
      if (memberName) query.memberName = memberName;

      records = await collection.find(query as any).sort({ startDate: -1 }).toArray();

      // Apply search filter if provided
      const search = searchParams.get("search");
      if (search) {
        const searchLower = search.toLowerCase();
        records = records.filter((record) => {
          const searchableFields = [
            record.memberId,
            record.memberName,
            record.invoiceNumber,
            record.membershipType,
          ].map((field) => field.toLowerCase());

          return searchableFields.some((field) => field.includes(searchLower));
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check for MongoDB connection errors or missing URI
      if (errorMessage.includes("MONGODB_URI") || errorMessage.includes("MongoClient") || errorMessage.includes("connection")) {
        logger.info("Using mock membership records data (MongoDB not configured or connection failed)");
        records = [...mockMembershipRecords];

        // Apply filters to mock data
        const searchParams = request.nextUrl.searchParams;
        const memberId = searchParams.get("memberId");
        const memberName = searchParams.get("memberName");
        const search = searchParams.get("search");

        if (memberId) {
          records = records.filter((r) => r.memberId === memberId);
        }
        if (memberName) {
          records = records.filter((r) => r.memberName === memberName);
        }
        if (search) {
          const searchLower = search.toLowerCase();
          records = records.filter((record) => {
            const searchableFields = [
              record.memberId,
              record.memberName,
              record.invoiceNumber,
              record.membershipType,
            ].map((field) => field.toLowerCase());

            return searchableFields.some((field) => field.includes(searchLower));
          });
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json(records);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching membership records", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/memberships",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch membership records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = membershipRecordSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid membership record data submitted", {
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
    const record: Omit<MembershipRecord, "id"> = {
      ...validatedData,
    };

    try {
      const db = await getDatabase();
      const collection = db.collection<MembershipRecord>("memberships");
      const recordWithId: MembershipRecord = {
        id: `membership-${Date.now()}`,
        ...record,
      };
      const result = await collection.insertOne(recordWithId as any);
      const createdRecord: MembershipRecord = {
        ...recordWithId,
        id: result.insertedId.toString(),
      };
      return NextResponse.json(createdRecord, { status: 201 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock mode for membership record creation");
        const mockRecord: MembershipRecord = {
          id: `membership-${Date.now()}`,
          ...record,
        };
        return NextResponse.json(mockRecord, { status: 201 });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating membership record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/memberships",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create membership record" },
      { status: 500 }
    );
  }
}

