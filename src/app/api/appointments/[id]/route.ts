import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Appointment } from "@/types/appointment";
import { mockAppointments } from "@/lib/mock-data";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { appointmentSchema } from "@/lib/validations/appointment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    try {
      const db = await getDatabase();
      const collection = db.collection<Appointment>("appointments");
      const appointment = await collection.findOne({ _id: new ObjectId(id) } as any);

      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(appointment);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const appointment = mockAppointments.find((a) => a._id === id);
        if (!appointment) {
          return NextResponse.json(
            { error: "Appointment not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(appointment);
      }
      throw error;
    }
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

    try {
      const db = await getDatabase();
      const collection = db.collection<Appointment>("appointments");

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const appointment = mockAppointments.find((a) => a._id === id);
        if (!appointment) {
          return NextResponse.json(
            { error: "Appointment not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ ...appointment, ...updateData });
      }
      throw error;
    }
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
    try {
      const db = await getDatabase();
      const collection = db.collection<Appointment>("appointments");

      const result = await collection.deleteOne({ _id: new ObjectId(id) } as any);

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        return NextResponse.json({ success: true });
      }
      throw error;
    }
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

