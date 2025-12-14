import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Member } from "@/features/dashboard/pages/members/types/member";
import { logger } from "@/lib/logger";
import { memberSchema } from "@/lib/validations/member";

interface MemberQuery {
  search?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let members: Member[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection<Member>("members");

      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get("search");
      const status = searchParams.get("status");

      const query: MemberQuery = {};
      if (status) query.status = status;

      const rawMembers = await collection.find(query as any).sort({ dateJoined: -1 }).toArray();

      // Transform customerNumber to memberNumber for backward compatibility
      members = rawMembers.map((member: any) => ({
        ...member,
        memberNumber: member.memberNumber || member.customerNumber,
        // Remove customerNumber if it exists to avoid confusion
        ...(member.customerNumber && !member.memberNumber ? {} : {}),
      }));

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        members = members.filter((member) => {
          const searchableFields = [
            member.memberNumber,
            member.fullName,
            member.email || "",
            member.company || "",
            member.location || "",
          ].map((field) => field.toLowerCase());

          return searchableFields.some((field) => field.includes(searchLower));
        });
      }
    } catch (error: unknown) {
      throw error;
    }

    return NextResponse.json(members);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching members", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/members",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = memberSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid member data submitted", {
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
    const member = {
      ...validatedData,
      dateJoined: validatedData.dateJoined ? new Date(validatedData.dateJoined).toISOString() : new Date().toISOString(),
    } as Omit<Member, "id">;

    try {
      const db = await getDatabase();
      const collection = db.collection<Member>("members");
      const memberWithId: Member & { customerNumber?: string } = {
        id: `member-${Date.now()}`,
        ...member,
        // Set customerNumber to match memberNumber for backward compatibility with unique index
        customerNumber: member.memberNumber,
      };
      const result = await collection.insertOne(memberWithId as any);
      const createdMember: Member = {
        ...memberWithId,
        id: result.insertedId.toString(),
      };
      return NextResponse.json(createdMember, { status: 201 });
    } catch (error: unknown) {
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating member",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/members",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
