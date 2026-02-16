import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { WorkoutProgram } from "@/features/dashboard/pages/program/types/workout-program";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { workoutProgramSchema } from "@/lib/validations/workout-program";

function toProgram(doc: any): WorkoutProgram {
  const id = doc._id?.toString?.() ?? doc.id;
  return {
    ...doc,
    id,
    _id: undefined,
  };
}

async function findProgram(collection: any, id: string) {
  if (/^[a-f0-9]{24}$/i.test(id)) {
    const doc = await collection.findOne({ _id: new ObjectId(id) } as any);
    if (doc) return doc;
  }
  return await collection.findOne({ _id: id } as any);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDatabase();
    const collection = db.collection("workout-programs");

    const doc = await findProgram(collection, id);

    if (!doc) {
      return NextResponse.json(
        { error: "Workout program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(toProgram(doc));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("MONGODB_URI") ||
      errorMessage.includes("MongoClient") ||
      errorMessage.includes("connection")
    ) {
      return NextResponse.json(
        { error: "Workout program not found" },
        { status: 404 }
      );
    }
    logger.error(
      "Error fetching workout program",
      error instanceof Error ? error : undefined,
      { endpoint: `/api/programs/${id}`, method: "GET" }
    );
    return NextResponse.json(
      { error: "Failed to fetch workout program" },
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

    const validationResult = workoutProgramSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = { ...validationResult.data };

    const db = await getDatabase();
    const collection = db.collection("workout-programs");

    const filter = /^[a-f0-9]{24}$/i.test(id)
      ? ({ _id: new ObjectId(id) } as any)
      : ({ _id: id } as any);

    const result = await collection.updateOne(filter, {
      $set: { ...updateData, updatedAt: new Date().toISOString() },
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Workout program not found" },
        { status: 404 }
      );
    }

    const updated = await findProgram(collection, id);
    return NextResponse.json(toProgram(updated));
  } catch (error: unknown) {
    logger.error(
      "Error updating workout program",
      error instanceof Error ? error : undefined,
      { endpoint: `/api/programs/${id}`, method: "PUT" }
    );
    return NextResponse.json(
      { error: "Failed to update workout program" },
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
    const db = await getDatabase();
    const collection = db.collection("workout-programs");

    const filter = /^[a-f0-9]{24}$/i.test(id)
      ? ({ _id: new ObjectId(id) } as any)
      : ({ _id: id } as any);

    const result = await collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Workout program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("MONGODB_URI") ||
      errorMessage.includes("MongoClient") ||
      errorMessage.includes("connection")
    ) {
      return NextResponse.json({ success: true });
    }
    logger.error(
      "Error deleting workout program",
      error instanceof Error ? error : undefined,
      { endpoint: `/api/programs/${id}`, method: "DELETE" }
    );
    return NextResponse.json(
      { error: "Failed to delete workout program" },
      { status: 500 }
    );
  }
}
