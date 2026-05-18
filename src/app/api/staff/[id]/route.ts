import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Staff } from "@/types/staff";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { staffSchema } from "@/lib/validations/staff";
import { hashPassword, isHashed } from "@/lib/password";

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

async function findStaffByAnyId(collection: any, id: string) {
  // Try string ID first (our DB stores ObjectId-as-string and plain strings).
  let staff = await collection.findOne({ _id: id });
  if (!staff) {
    try {
      staff = await collection.findOne({ _id: new ObjectId(id) });
    } catch {
      /* not a valid ObjectId — fine */
    }
  }
  if (!staff) {
    staff = await collection.findOne({ staffID: id });
  }
  return staff;
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
      logger.error("staff [id] GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const staff = await findStaffByAnyId(db.collection("staff"), id);
    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }
    return NextResponse.json(staff);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching staff", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: `/api/staff/${id}`,
      method: "GET",
    });
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const validationResult = staffSchema.partial().safeParse(body);
    if (!validationResult.success) {
      logger.warn("Invalid staff update data", {
        errors: validationResult.error.errors,
        staffId: id,
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

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("staff [id] PUT: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("staff");

    // Process staffID if provided
    let processedStaffID = validatedData.staffID;
    if (processedStaffID !== undefined) {
      processedStaffID = processedStaffID.trim();

      if (processedStaffID && !/^\d+$/.test(processedStaffID)) {
        return NextResponse.json(
          { error: "Staff ID must be numeric only" },
          { status: 400 }
        );
      }

      if (processedStaffID) {
        processedStaffID = processedStaffID.padStart(6, "0");

        if (processedStaffID.length > 6) {
          return NextResponse.json(
            { error: "Staff ID must be 6 digits or less" },
            { status: 400 }
          );
        }

        // Uniqueness check excluding current staff
        const currentStaff = await findStaffByAnyId(collection, id);
        const existing = await collection.findOne({
          staffID: processedStaffID,
          _id: { $ne: currentStaff?._id } as any,
        } as any);

        if (existing) {
          return NextResponse.json(
            { error: "Staff ID already exists" },
            { status: 400 }
          );
        }
      }
    }

    // Hash password if it's being updated and isn't already hashed
    let processedPassword = validatedData.password;
    if (typeof processedPassword === "string" && processedPassword.length > 0 && !isHashed(processedPassword)) {
      processedPassword = hashPassword(processedPassword);
    }

    const updateData = {
      ...validatedData,
      ...(processedStaffID !== undefined && { staffID: processedStaffID }),
      ...(processedPassword !== undefined && { password: processedPassword }),
      documents: body.documents !== undefined ? body.documents : validatedData.documents,
      updatedAt: new Date(),
    } as Partial<Staff>;

    // Try string ID first
    let result = await collection.updateOne(
      { _id: id } as any,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      try {
        result = await collection.updateOne(
          { _id: new ObjectId(id) } as any,
          { $set: updateData }
        );
      } catch {
        /* not a valid ObjectId — fine */
      }
    }

    if (result.matchedCount === 0) {
      result = await collection.updateOne(
        { staffID: id } as any,
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const updated = await findStaffByAnyId(collection, id);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating staff",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/staff/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
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
      logger.error("staff [id] DELETE: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("staff");

    let result = await collection.deleteOne({ _id: id } as any);
    if (result.deletedCount === 0) {
      try {
        result = await collection.deleteOne({ _id: new ObjectId(id) } as any);
      } catch {
        /* not a valid ObjectId — fine */
      }
    }
    if (result.deletedCount === 0) {
      result = await collection.deleteOne({ staffID: id } as any);
    }

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error deleting staff", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: `/api/staff/${id}`,
      method: "DELETE",
    });
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
