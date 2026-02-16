import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Membership } from "@/features/dashboard/pages/memberships/types/membership";
import { mockMemberships } from "@/features/dashboard/pages/memberships/data/mock-memberships";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { membershipTypeSchema } from "@/lib/validations/membership-type";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    try {
      const db = await getDatabase();
      const collection = db.collection("membership-types");
      
      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let membership = await collection.findOne({ _id: id } as any);
      
      // If not found, try ObjectId (for compatibility)
      if (!membership) {
        try {
          membership = await collection.findOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      
      // If still not found, try finding by id field (for backward compatibility)
      if (!membership) {
        membership = await collection.findOne({ id: id } as any);
      }

      if (!membership) {
        return NextResponse.json(
          { error: "Membership not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(membership);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const membership = mockMemberships.find((m) => m.id === id);
        if (!membership) {
          return NextResponse.json(
            { error: "Membership not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(membership);
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching membership",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/package-types/memberships/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch membership" },
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
    const validationResult = membershipTypeSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid membership update data", {
        errors: validationResult.error.errors,
        membershipId: id,
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
    } as Partial<Membership>;

    try {
      const db = await getDatabase();
      const collection = db.collection("membership-types");

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
          { error: "Membership not found" },
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const membership = mockMemberships.find((m) => m.id === id);
        if (!membership) {
          return NextResponse.json(
            { error: "Membership not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ ...membership, ...updateData });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating membership",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/package-types/memberships/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update membership" },
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
      const collection = db.collection("membership-types");

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
          { error: "Membership not found" },
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
      "Error deleting membership",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/package-types/memberships/${id}`,
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to delete membership" },
      { status: 500 }
    );
  }
}

