import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Appointment } from "@/types/appointment";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { appointmentSchema } from "@/lib/validations/appointment";

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
      logger.error("appointments/[id] GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("appointments");
    const appointment = await collection.findOne({ _id: new ObjectId(id) } as any);

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(appointment);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching appointment",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/appointments/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
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
    const validationResult = appointmentSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid appointment update data", {
        errors: validationResult.error.errors,
        appointmentId: id,
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
    const updateData: Partial<Appointment> = {
      ...validatedData,
      updatedAt: new Date(),
    };

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("appointments/[id] PUT: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("appointments");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) } as any,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const updated = await collection.findOne({ _id: new ObjectId(id) } as any);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating appointment",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/appointments/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update appointment" },
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
      logger.error("appointments/[id] DELETE: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("appointments");

    const result = await collection.deleteOne({ _id: new ObjectId(id) } as any);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error deleting appointment",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/appointments/${id}`,
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
}
