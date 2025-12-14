import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Member } from "@/features/dashboard/pages/members/types/member";
import { mockMembers } from "@/features/dashboard/pages/members/data/mock-members";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { memberSchema } from "@/lib/validations/member";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    try {
      const db = await getDatabase();
      const collection = db.collection<Member>("members");
      
      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let member = await collection.findOne({ _id: id } as any);
      
      // If not found with string ID, try ObjectId (for compatibility)
      if (!member) {
        try {
          member = await collection.findOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      
      // If still not found, try memberNumber (for URL-friendly routing)
      if (!member) {
        member = await collection.findOne({ memberNumber: id } as any);
      }
      
      // If still not found, try customerNumber (for backward compatibility)
      if (!member) {
        member = await collection.findOne({ customerNumber: id } as any);
      }

      if (!member) {
        return NextResponse.json(
          { error: "Member not found" },
          { status: 404 }
        );
      }

      // Transform customerNumber to memberNumber for backward compatibility
      const transformedMember = {
        ...member,
        memberNumber: (member as any).memberNumber || (member as any).customerNumber,
      };

      return NextResponse.json(transformedMember);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const member = mockMembers.find((m) => m.id === id);
        if (!member) {
          return NextResponse.json(
            { error: "Member not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(member);
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching member",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/members/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch member" },
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
    const validationResult = memberSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid member update data", {
        errors: validationResult.error.errors,
        memberId: id,
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
    // Include documents from body (now included in schema, but ensure it's preserved)
    const updateData = {
      ...validatedData,
      // Preserve documents from body if present
      documents: body.documents !== undefined ? body.documents : validatedData.documents,
    } as Partial<Member>;

    try {
      const db = await getDatabase();
      const collection = db.collection<Member>("members");

      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let result = await collection.updateOne(
        { _id: id } as any,
        { $set: updateData }
      );

      // If not found with string ID, try ObjectId (for compatibility)
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

      // If still not found, try memberNumber (for URL-friendly routing)
      if (result.matchedCount === 0) {
        result = await collection.updateOne(
          { memberNumber: id } as any,
          { $set: updateData }
        );
      }

      // If still not found, try customerNumber (for backward compatibility)
      if (result.matchedCount === 0) {
        result = await collection.updateOne(
          { customerNumber: id } as any,
          { $set: updateData }
        );
      }

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Member not found" },
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
      // If still not found, try memberNumber
      if (!updated) {
        updated = await collection.findOne({ memberNumber: id } as any);
      }
      // If still not found, try customerNumber
      if (!updated) {
        updated = await collection.findOne({ customerNumber: id } as any);
      }
      
      // Transform customerNumber to memberNumber for backward compatibility
      if (updated) {
        updated = {
          ...updated,
          memberNumber: (updated as any).memberNumber || (updated as any).customerNumber,
        };
      }
      
      return NextResponse.json(updated);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        const member = mockMembers.find((m) => m.id === id);
        if (!member) {
          return NextResponse.json(
            { error: "Member not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ ...member, ...updateData });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating member",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/members/${id}`,
        method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update member" },
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
      const collection = db.collection<Member>("members");

      // Try multiple strategies to find and delete the member
      let result = await collection.deleteOne({ _id: id } as any);

      // If not found with string ID, try ObjectId (for compatibility)
      if (result.deletedCount === 0) {
        try {
          result = await collection.deleteOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }

      // If still not found, try the 'id' field (for members created with temporary IDs)
      if (result.deletedCount === 0) {
        result = await collection.deleteOne({ id: id } as any);
      }
      
      // If still not found, try memberNumber or customerNumber (for URL-friendly routing)
      if (result.deletedCount === 0) {
        result = await collection.deleteOne({ memberNumber: id } as any);
        if (result.deletedCount === 0) {
          result = await collection.deleteOne({ customerNumber: id } as any);
        }
      }

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Member not found" },
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
      "Error deleting member",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/members/${id}`,
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to delete member" },
      { status: 500 }
    );
  }
}

