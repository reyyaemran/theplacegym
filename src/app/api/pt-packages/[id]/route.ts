import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { mockPTPackageRecords } from "@/features/dashboard/pages/ptpackage-invoice/data/mock-pt-package-records";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { ptPackageRecordSchema } from "@/lib/validations/pt-package-record";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    try {
      const db = await getDatabase();
      const collection = db.collection<PTPackageRecord>("pt-packages");
      const record = await collection.findOne({ _id: new ObjectId(id) } as any);

      if (!record) {
        return NextResponse.json(
          { error: "PT package record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(record);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const record = mockPTPackageRecords.find((r) => r.id === id);
        if (!record) {
          return NextResponse.json(
            { error: "PT package record not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(record);
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching PT package record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/pt-packages/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch PT package record" },
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
    const validationResult = ptPackageRecordSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid PT package record update data", {
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
    } as Partial<PTPackageRecord>;

    try {
      const db = await getDatabase();
      const collection = db.collection<PTPackageRecord>("pt-packages");

      const result = await collection.updateOne(
        { _id: new ObjectId(id) } as any,
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "PT package record not found" },
          { status: 404 }
        );
      }

      const updated = await collection.findOne({ _id: new ObjectId(id) } as any);
      return NextResponse.json(updated);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const record = mockPTPackageRecords.find((r) => r.id === id);
        if (!record) {
          return NextResponse.json(
            { error: "PT package record not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ ...record, ...updateData });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating PT package record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/pt-packages/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update PT package record" },
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
      const collection = db.collection<PTPackageRecord>("pt-packages");

      const result = await collection.deleteOne({ _id: new ObjectId(id) } as any);

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "PT package record not found" },
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
      "Error deleting PT package record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/pt-packages/${id}`,
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to delete PT package record" },
      { status: 500 }
    );
  }
}

