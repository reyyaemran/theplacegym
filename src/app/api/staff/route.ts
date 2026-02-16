import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Staff, StaffPermission } from "@/types/staff";
import { mockStaff } from "@/lib/mock-data";
import { logger } from "@/lib/logger";
import { staffSchema } from "@/lib/validations/staff";

interface StaffQuery {
  department?: string;
  level?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Try to use MongoDB if available, otherwise use mock data
    let staff: Staff[] = [];
    
    try {
      const db = await getDatabase();
      const collection = db.collection("staff");
      
      const searchParams = request.nextUrl.searchParams;
      const department = searchParams.get("department");
      const level = searchParams.get("level");
      const status = searchParams.get("status");
      
      const query: StaffQuery = {};
      if (department) query.department = department;
      if (level) query.level = level;
      if (status) query.status = status;
      
      staff = await collection.find(query as any).sort({ name: 1 }).toArray() as unknown as Staff[];
    } catch (error: unknown) {
      // If MongoDB is not configured, use mock data
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock staff data (MongoDB not configured)");
        staff = [...mockStaff];
        
        // Apply filters to mock data
        const searchParams = request.nextUrl.searchParams;
        const department = searchParams.get("department");
        const level = searchParams.get("level");
        const status = searchParams.get("status");
        
        if (department) {
          staff = staff.filter((s) => s.department === department);
        }
        if (level) {
          staff = staff.filter((s) => s.level === level);
        }
        if (status) {
          staff = staff.filter((s) => s.status === status);
        }
      } else {
        throw error;
      }
    }
    
    return NextResponse.json(staff);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching staff", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/staff",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = staffSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid staff data submitted", {
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

    const validatedData = validationResult.data;
    
    // Process staffID: enforce 6-digit numeric format
    let staffID = validatedData.staffID;
    
    if (staffID) {
      // Remove any whitespace
      staffID = staffID.trim();
      
      // Validate that it's numeric only
      if (!/^\d+$/.test(staffID)) {
        return NextResponse.json(
          { error: "Staff ID must be numeric only" },
          { status: 400 }
        );
      }
      
      // Pad to 6 digits with leading zeros
      staffID = staffID.padStart(6, "0");
      
      // Ensure it doesn't exceed 6 digits
      if (staffID.length > 6) {
        return NextResponse.json(
          { error: "Staff ID must be 6 digits or less" },
          { status: 400 }
        );
      }
    } else {
      // Auto-generate a 6-digit number if not provided
      // Try to find a unique ID (max 10 attempts)
      let attempts = 0;
      let isUnique = false;
      
      try {
        const db = await getDatabase();
        const collection = db.collection("staff");
        
        while (!isUnique && attempts < 10) {
          const randomNum = Math.floor(100000 + Math.random() * 900000);
          staffID = randomNum.toString().padStart(6, "0");
          
          // Check if this staffID already exists
          const existing = await collection.findOne({ staffID } as any);
          if (!existing) {
            isUnique = true;
          }
          attempts++;
        }
      } catch (dbError: unknown) {
        // If MongoDB is not available, just generate a random ID (mock mode)
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        if (errorMessage.includes("MONGODB_URI")) {
          const randomNum = Math.floor(100000 + Math.random() * 900000);
          staffID = randomNum.toString().padStart(6, "0");
          isUnique = true;
        } else {
          throw dbError;
        }
      }
      
      if (!isUnique) {
        return NextResponse.json(
          { error: "Failed to generate unique staff ID. Please try again." },
          { status: 500 }
        );
      }
    }
    
    // Check for uniqueness before inserting (if staffID was provided)
    if (validatedData.staffID) {
      try {
        const db = await getDatabase();
        const collection = db.collection("staff");
        const existing = await collection.findOne({ staffID } as any);
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

    // Cast validatedData.permissions to StaffPermission[] | undefined
    const permissions = validatedData.permissions as StaffPermission[] | undefined;

    const staff: Omit<Staff, "_id" | "createdAt" | "updatedAt"> = {
      ...validatedData,
      staffID, // Use the generated or provided staffID
      permissions,
      hireDate: validatedData.hireDate,
      dateOfBirth: validatedData.dateOfBirth,
    };
    
    // Try MongoDB first, otherwise just return the data (mock mode)
    try {
      const db = await getDatabase();
      const collection = db.collection("staff");
      const staffWithTimestamps: Omit<Staff, "_id"> = {
        ...staff,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await collection.insertOne(
        staffWithTimestamps as any
      );
      const createdStaff: Staff = {
        _id: result.insertedId.toString(),
        ...staffWithTimestamps,
      };
      return NextResponse.json(createdStaff, { status: 201 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        // Mock mode - just return with generated ID
        logger.info("Using mock mode for staff creation");
        const mockStaff: Staff = {
          _id: Date.now().toString(),
          ...staff,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return NextResponse.json(mockStaff, { status: 201 });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating staff",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
      endpoint: "/api/staff",
      method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create staff" },
      { status: 500 }
    );
  }
}
