import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { WorkoutProgram } from "@/features/dashboard/pages/program/types/workout-program";
import { logger } from "@/lib/logger";
import { workoutProgramSchema } from "@/lib/validations/workout-program";

function toProgram(doc: any): WorkoutProgram {
  const id = doc._id?.toString?.() ?? doc.id;
  return {
    ...doc,
    id,
    _id: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    let programs: WorkoutProgram[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection("workout-programs");

      const raw = await collection.find({}).sort({ createdAt: -1 }).toArray();
      programs = raw.map(toProgram);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("MONGODB_URI") ||
        errorMessage.includes("MongoClient") ||
        errorMessage.includes("connection")
      ) {
        logger.info(
          "Using mock mode for workout programs (MongoDB not configured or connection failed)"
        );
        programs = [];
      } else {
        throw error;
      }
    }

    return NextResponse.json(programs);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching workout programs",
      errorMessage instanceof Error ? errorMessage : undefined,
      { endpoint: "/api/programs", method: "GET" }
    );
    return NextResponse.json(
      { error: "Failed to fetch workout programs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = workoutProgramSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid workout program data submitted", {
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

    const { id: _omitId, ...data } = validationResult.data;
    const doc = {
      ...data,
      createdAt: new Date().toISOString(),
    };

    try {
      const db = await getDatabase();
      const collection = db.collection("workout-programs");

      const result = await collection.insertOne(doc as any);
      const id = result.insertedId.toString();

      return NextResponse.json(toProgram({ ...doc, _id: result.insertedId }), {
        status: 201,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("MONGODB_URI") ||
        errorMessage.includes("MongoClient") ||
        errorMessage.includes("connection")
      ) {
        logger.info("MongoDB not available for workout program creation");
        return NextResponse.json(
          { error: "Database not available. Please configure MongoDB." },
          { status: 503 }
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating workout program",
      errorMessage instanceof Error ? errorMessage : undefined,
      { endpoint: "/api/programs", method: "POST" }
    );
    return NextResponse.json(
      { error: "Failed to create workout program" },
      { status: 500 }
    );
  }
}
