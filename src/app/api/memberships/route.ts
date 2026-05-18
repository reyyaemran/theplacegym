import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { logger } from "@/lib/logger";
import { membershipRecordSchema } from "@/lib/validations/membership-record";

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

interface MembershipQuery {
  memberId?: string;
  memberName?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("memberships GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("memberships");

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const memberName = searchParams.get("memberName");

    const query: MembershipQuery = {};
    if (memberId) query.memberId = memberId;
    if (memberName) query.memberName = memberName;

    let records = await collection.find(query as any).sort({ startDate: -1 }).toArray() as unknown as MembershipRecord[];

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

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("memberships POST: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("memberships");
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
