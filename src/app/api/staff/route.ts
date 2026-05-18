import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Staff, StaffPermission, DEFAULT_PERMISSIONS_BY_DEPARTMENT } from "@/types/staff";
import { logger } from "@/lib/logger";
import { staffSchema } from "@/lib/validations/staff";
import { hashPassword } from "@/lib/password";

interface StaffQuery {
  department?: string;
  level?: string;
  status?: string;
}

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  try {
    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("staff GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("staff");

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get("department");
    const level = searchParams.get("level");
    const status = searchParams.get("status");

    const query: StaffQuery = {};
    if (department) query.department = department;
    if (level) query.level = level;
    if (status) query.status = status;

    const rawStaff = await collection.find(query as any).sort({ name: 1 }).toArray();
    const staff = rawStaff.map((s: any) => ({
      ...s,
      _id: s._id?.toString(),
    })) as Staff[];

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

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("staff POST: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("staff");

    // Process staffID: enforce 6-digit numeric format
    let staffID = validatedData.staffID;

    if (staffID) {
      staffID = staffID.trim();

      if (!/^\d+$/.test(staffID)) {
        return NextResponse.json(
          { error: "Staff ID must be numeric only" },
          { status: 400 }
        );
      }

      staffID = staffID.padStart(6, "0");

      if (staffID.length > 6) {
        return NextResponse.json(
          { error: "Staff ID must be 6 digits or less" },
          { status: 400 }
        );
      }
    } else {
      // Auto-generate unique 6-digit staff ID
      let attempts = 0;
      let isUnique = false;

      while (!isUnique && attempts < 10) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        staffID = randomNum.toString().padStart(6, "0");
        const existing = await collection.findOne({ staffID } as any);
        if (!existing) isUnique = true;
        attempts++;
      }

      if (!isUnique) {
        return NextResponse.json(
          { error: "Failed to generate unique staff ID. Please try again." },
          { status: 500 }
        );
      }
    }

    // Uniqueness check for user-provided staffID
    if (validatedData.staffID) {
      const existing = await collection.findOne({ staffID } as any);
      if (existing) {
        return NextResponse.json(
          { error: "Staff ID already exists" },
          { status: 400 }
        );
      }
    }

    const explicitPermissions = validatedData.permissions as StaffPermission[] | undefined;
    const permissions =
      explicitPermissions && explicitPermissions.length > 0
        ? explicitPermissions
        : DEFAULT_PERMISSIONS_BY_DEPARTMENT[validatedData.department] || ["view_dashboard"];

    // Hash password if provided
    const hashedPassword = validatedData.password
      ? hashPassword(validatedData.password)
      : validatedData.password;

    const staff: Omit<Staff, "_id" | "createdAt" | "updatedAt"> = {
      ...validatedData,
      password: hashedPassword,
      staffID,
      permissions,
      loginEnabled: validatedData.loginEnabled ?? true,
      role: validatedData.role || "STAFF",
      hireDate: validatedData.hireDate,
      dateOfBirth: validatedData.dateOfBirth,
    };

    const staffWithTimestamps: Omit<Staff, "_id"> = {
      ...staff,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(staffWithTimestamps as any);
    const createdStaff: Staff = {
      _id: result.insertedId.toString(),
      ...staffWithTimestamps,
    };
    return NextResponse.json(createdStaff, { status: 201 });
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
