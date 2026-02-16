import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { PTPackage } from "@/features/dashboard/pages/services/types/pt-package";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { ptPackageTypeSchema } from "@/lib/validations/pt-package-type";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    try {
      const db = await getDatabase();
      const collection = db.collection("pt-package-types");
      
      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let pkg = await collection.findOne({ _id: id } as any);
      
      // If not found, try ObjectId (for compatibility)
      if (!pkg) {
        try {
          pkg = await collection.findOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      
      // If still not found, try finding by id field (for backward compatibility)
      if (!pkg) {
        pkg = await collection.findOne({ id: id } as any);
      }

      if (!pkg) {
        return NextResponse.json(
          { error: "PT package not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(pkg);
    } catch (error: unknown) {
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching PT package",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/package-types/pt-packages/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch PT package" },
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
    const validationResult = ptPackageTypeSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid PT package update data", {
        errors: validationResult.error.errors,
        packageId: id,
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
      updatedAt: new Date().toISOString(),
    } as Partial<PTPackage>;

    // Recalculate pricePerSession if price or sessions changed
    if (validatedData.price !== undefined || validatedData.sessions !== undefined) {
      // We need to get the current package to calculate properly
      // For now, if both are provided, calculate it
      if (validatedData.price !== undefined && validatedData.sessions !== undefined) {
        updateData.pricePerSession = validatedData.price / validatedData.sessions;
      }
    }

    try {
      const db = await getDatabase();
      const collection = db.collection("pt-package-types");

      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let result = await collection.updateOne(
        { _id: id } as any,
        { $set: updateData }
      );

      // If not found, try ObjectId (for compatibility)
      if (result.matchedCount === 0) {
        try {
          result = await collection.updateOne(
            { _id: new ObjectId(id) } as any,
            { $set: updateData }
          );
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      
      // If still not found, try finding by id field (for backward compatibility)
      if (result.matchedCount === 0) {
        result = await collection.updateOne(
          { id: id } as any,
          { $set: updateData }
        );
      }

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "PT package not found" },
          { status: 404 }
        );
      }

      // Fetch updated document - try string ID first
      let updated = await collection.findOne({ _id: id } as any);
      if (!updated) {
        try {
          updated = await collection.findOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      if (!updated) {
        updated = await collection.findOne({ id: id } as any);
      }
      return NextResponse.json(updated);
    } catch (error: unknown) {
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating PT package",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/package-types/pt-packages/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update PT package" },
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
      const collection = db.collection("pt-package-types");

      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let result = await collection.deleteOne({ _id: id } as any);

      // If not found, try ObjectId (for compatibility)
      if (result.deletedCount === 0) {
        try {
          result = await collection.deleteOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      
      // If still not found, try finding by id field (for backward compatibility)
      if (result.deletedCount === 0) {
        result = await collection.deleteOne({ id: id } as any);
      }

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "PT package not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error deleting PT package",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/package-types/pt-packages/${id}`,
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to delete PT package" },
      { status: 500 }
    );
  }
}
