import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { MealPlan } from "@/features/dashboard/pages/meal-planner/types/meal-plan";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { mealPlanSchema } from "@/lib/validations/meal-plan";

function toMealPlan(doc: any): MealPlan {
  const id = doc._id?.toString?.() ?? doc.id;
  return {
    ...doc,
    id,
    _id: undefined,
  };
}

async function findMealPlan(collection: any, id: string) {
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
    const collection = db.collection("meal-plans");

    const doc = await findMealPlan(collection, id);

    if (!doc) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(toMealPlan(doc));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("MONGODB_URI") ||
      errorMessage.includes("MongoClient") ||
      errorMessage.includes("connection")
    ) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }
    logger.error(
      "Error fetching meal plan",
      error instanceof Error ? error : undefined,
      { endpoint: `/api/meal-plans/${id}`, method: "GET" }
    );
    return NextResponse.json(
      { error: "Failed to fetch meal plan" },
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

    const validationResult = mealPlanSchema.partial().safeParse(body);

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
    const collection = db.collection("meal-plans");

    const filter = /^[a-f0-9]{24}$/i.test(id)
      ? ({ _id: new ObjectId(id) } as any)
      : ({ _id: id } as any);

    const result = await collection.updateOne(filter, {
      $set: { ...updateData, updatedAt: new Date().toISOString() },
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      );
    }

    const updated = await findMealPlan(collection, id);
    return NextResponse.json(toMealPlan(updated));
  } catch (error: unknown) {
    logger.error(
      "Error updating meal plan",
      error instanceof Error ? error : undefined,
      { endpoint: `/api/meal-plans/${id}`, method: "PUT" }
    );
    return NextResponse.json(
      { error: "Failed to update meal plan" },
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
    const collection = db.collection("meal-plans");

    const filter = /^[a-f0-9]{24}$/i.test(id)
      ? ({ _id: new ObjectId(id) } as any)
      : ({ _id: id } as any);

    const result = await collection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Meal plan not found" },
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
      "Error deleting meal plan",
      error instanceof Error ? error : undefined,
      { endpoint: `/api/meal-plans/${id}`, method: "DELETE" }
    );
    return NextResponse.json(
      { error: "Failed to delete meal plan" },
      { status: 500 }
    );
  }
}
