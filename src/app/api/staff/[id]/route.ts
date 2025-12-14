import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Staff } from "@/types/staff";
import { mockStaff } from "@/lib/mock-data";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";
import { staffSchema } from "@/lib/validations/staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    
    try {
      const db = await getDatabase();
      const collection = db.collection<Staff>("staff");
      
      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let staff = await collection.findOne({ _id: id } as any);
      
      // If not found with string ID, try ObjectId (for compatibility)
      if (!staff) {
        try {
          staff = await collection.findOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue with string search
        }
      }
      
      // If still not found, try searching by staffID
      if (!staff) {
        staff = await collection.findOne({ staffID: id } as any);
      }
      
      if (!staff) {
        return NextResponse.json(
          { error: "Staff not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(staff);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        // Use mock data - try _id first, then staffID
        let staff = mockStaff.find((s) => s._id === id);
        if (!staff) {
          staff = mockStaff.find((s) => s.staffID === id);
        }
        if (!staff) {
          return NextResponse.json(
            { error: "Staff not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(staff);
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching staff", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: `/api/staff/${id}`,
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch staff" },
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
    const validationResult = staffSchema.partial().safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid staff update data", {
        errors: validationResult.error.errors,
        staffId: id,
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
    
    // Process staffID if provided: enforce 6-digit numeric format
    let processedStaffID = validatedData.staffID;
    if (processedStaffID !== undefined) {
      // Remove any whitespace
      processedStaffID = processedStaffID.trim();
      
      // Validate that it's numeric only
      if (processedStaffID && !/^\d+$/.test(processedStaffID)) {
        return NextResponse.json(
          { error: "Staff ID must be numeric only" },
          { status: 400 }
        );
      }
      
      if (processedStaffID) {
        // Pad to 6 digits with leading zeros
        processedStaffID = processedStaffID.padStart(6, "0");
        
        // Ensure it doesn't exceed 6 digits
        if (processedStaffID.length > 6) {
          return NextResponse.json(
            { error: "Staff ID must be 6 digits or less" },
            { status: 400 }
          );
        }
        
        // Check for uniqueness (excluding current staff)
        try {
          const db = await getDatabase();
          const collection = db.collection<Staff>("staff");
          
          // Find current staff to exclude from uniqueness check
          let currentStaff = await collection.findOne({ _id: id } as any);
          if (!currentStaff) {
            try {
              currentStaff = await collection.findOne({ _id: new ObjectId(id) } as any);
            } catch (objectIdError) {
              // ObjectId conversion failed, continue
            }
          }
          if (!currentStaff) {
            currentStaff = await collection.findOne({ staffID: id } as any);
          }
          
          // Check if staffID is already used by another staff member
          const existing = await collection.findOne({ 
            staffID: processedStaffID,
            _id: { $ne: currentStaff?._id } as any
          } as any);
          
          if (existing) {
            return NextResponse.json(
              { error: "Staff ID already exists" },
              { status: 400 }
            );
          }
        } catch (dbError: unknown) {
          // If MongoDB is not available, skip uniqueness check (mock mode)
          const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
          if (!errorMessage.includes("MONGODB_URI")) {
            throw dbError;
          }
        }
      }
    }
    
    // Include documents from body (now included in schema, but ensure it's preserved)
    const updateData: Partial<Staff> = {
      ...validatedData,
      // Use processed staffID if it was provided
      ...(processedStaffID !== undefined && { staffID: processedStaffID }),
      // Preserve documents from body if present
      documents: body.documents !== undefined ? body.documents : validatedData.documents,
      updatedAt: new Date(),
    };
    
    try {
      const db = await getDatabase();
      const collection = db.collection<Staff>("staff");

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

      // If still not found, try searching by staffID
      if (result.matchedCount === 0) {
        result = await collection.updateOne(
          { staffID: id } as any,
          { $set: updateData }
        );
      }

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: "Staff not found" },
          { status: 404 }
        );
      }

      // Fetch updated document - try string ID first, then staffID
      let updated = await collection.findOne({ _id: id } as any);
      if (!updated) {
        try {
          updated = await collection.findOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      if (!updated) {
        updated = await collection.findOne({ staffID: id } as any);
      }
      return NextResponse.json(updated);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        // Mock mode - just return updated data
        const staff = mockStaff.find((s) => s._id === id);
        if (!staff) {
          return NextResponse.json(
            { error: "Staff not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ ...staff, ...updateData });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error updating staff",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
      endpoint: `/api/staff/${id}`,
      method: "PUT",
      }
    );
    return NextResponse.json(
      { error: "Failed to update staff" },
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
      const collection = db.collection<Staff>("staff");
      
      // Try string ID first (since MongoDB stores IDs as strings in our case)
      let result = await collection.deleteOne({ _id: id } as any);
      
      // If not found with string ID, try ObjectId (for compatibility)
      if (result.deletedCount === 0) {
        try {
          result = await collection.deleteOne({ _id: new ObjectId(id) } as any);
        } catch (objectIdError) {
          // ObjectId conversion failed, continue
        }
      }
      
      // If still not found, try searching by staffID
      if (result.deletedCount === 0) {
        result = await collection.deleteOne({ staffID: id } as any);
      }
      
      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Staff not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        // Mock mode - just return success
        return NextResponse.json({ success: true });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error deleting staff", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: `/api/staff/${id}`,
      method: "DELETE",
    });
    return NextResponse.json(
      { error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}

