import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MealPlan } from "@/features/dashboard/pages/meal-planner/types/meal-plan";
import { logger } from "@/lib/logger";
import { mealPlanSchema } from "@/lib/validations/meal-plan";

function toMealPlan(doc: any): MealPlan {
  const id = doc._id?.toString?.() ?? doc.id;
  return {
    ...doc,
    id,
    _id: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    let plans: MealPlan[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection("meal-plans");

      const raw = await collection.find({}).sort({ createdAt: -1 }).toArray();
      plans = raw.map(toMealPlan);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("MONGODB_URI") ||
        errorMessage.includes("MongoClient") ||
        errorMessage.includes("connection")
      ) {
        logger.info(
          "Using mock mode for meal plans (MongoDB not configured or connection failed)"
        );
        plans = [];
      } else {
        throw error;
      }
    }

    return NextResponse.json(plans);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching meal plans",
      errorMessage instanceof Error ? errorMessage : undefined,
      { endpoint: "/api/meal-plans", method: "GET" }
    );
    return NextResponse.json(
      { error: "Failed to fetch meal plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = mealPlanSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid meal plan data submitted", {
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
      const collection = db.collection("meal-plans");

      const result = await collection.insertOne(doc as any);

      return NextResponse.json(toMealPlan({ ...doc, _id: result.insertedId }), {
        status: 201,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("MONGODB_URI") ||
        errorMessage.includes("MongoClient") ||
        errorMessage.includes("connection")
      ) {
        logger.info("MongoDB not available for meal plan creation");
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
      "Error creating meal plan",
      errorMessage instanceof Error ? errorMessage : undefined,
      { endpoint: "/api/meal-plans", method: "POST" }
    );
    return NextResponse.json(
      { error: "Failed to create meal plan" },
      { status: 500 }
    );
  }
}
