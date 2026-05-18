import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { membershipRecordSchema } from "@/lib/validations/membership-record";

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("memberships/[id] GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("memberships");
    const record = await collection.findOne({ _id: new ObjectId(id) } as any);

    if (!record) {
      return NextResponse.json(
        { error: "Membership record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching membership record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/memberships/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch membership record" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    // Validate request body with Zod (partial validation for updates)
    const validationResult = membershipRecordSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid membership record update data", {
        errors: validationResult.error.errors,
        recordId: id,
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
    const updateData = {
      ...validatedData,
    } as Partial<MembershipRecord>;

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("memberships/[id] PUT: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("memberships");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) } as any,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Membership record not found" },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) } as any);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating membership record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/memberships/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update membership record" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("memberships/[id] DELETE: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("memberships");

    const result = await collection.deleteOne({ _id: new ObjectId(id) } as any);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Membership record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error deleting membership record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/memberships/${id}`,
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to delete membership record" },
      { status: 500 }
    );
  }
}
