import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Staff } from "@/types/staff";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { mockStaff } from "@/lib/mock-data";

interface LoginRequest {
  email?: string;
  staffID?: string; // This is essentially the "password" input from the frontend
  password?: string; // Some frontends might send 'password' field instead
}

// Admin credentials (in production, these should be stored securely in a database)
// Fallback to environment variables for development/testing
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || "theplaceadmin@theplace.com.kh",
  password: process.env.ADMIN_PASSWORD || "admin123",
  name: "Super Admin",
  role: "SUPERADMIN" as const,
};

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    // The frontend might send the password in 'staffID' field or 'password' field depending on the form
    // But based on previous context, the login form has Email and "Staff ID" (which is the password)
    const { email } = body;
    const passwordInput = body.staffID || body.password; 

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!passwordInput) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if this is an admin login attempt
    let adminUser: { email: string; password: string; name: string; role: string } | null = null;
    
    try {
      const db = await getDatabase();
      const usersCollection = db.collection("users");
      adminUser = await usersCollection.findOne({
        email: normalizedEmail,
        role: "SUPERADMIN",
      }) as any;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        if (normalizedEmail === ADMIN_CREDENTIALS.email.toLowerCase()) {
          adminUser = ADMIN_CREDENTIALS;
        }
      } else {
        throw error;
      }
    }

    if (adminUser) {
      if (passwordInput !== adminUser.password) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }

      const sessionData = {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        isAdmin: true,
      };

      const cookieStore = await cookies();
      cookieStore.set("session", JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      logger.info("Admin login successful", {
        // Email is not logged for security reasons
      });

      return NextResponse.json({
        success: true,
        staff: {
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });
    }

    // If not admin, check staff collection
    let staff: Staff | null = null;

    try {
      const db = await getDatabase();
      const collection = db.collection<Staff>("staff");
      // Find by email only first, then verify password/staffID
      staff = await collection.findOne({
        email: email.toLowerCase().trim(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock staff data for authentication (MongoDB not configured)");
        staff =
          mockStaff.find(
            (s) => s.email?.toLowerCase().trim() === email.toLowerCase().trim()
          ) || null;
      } else {
        throw error;
      }
    }

    if (!staff) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify Password
    // 1. If staff has a specific password set, check against that
    // 2. If not, check against staffID (default password)
    const isPasswordValid = staff.password 
      ? staff.password === passwordInput 
      : staff.staffID === passwordInput;

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if login is enabled for this staff member
    if (staff.loginEnabled === false) {
      return NextResponse.json(
        { error: "Login access is disabled for this account" },
        { status: 403 }
      );
    }

    // Create staff session data
    const sessionData = {
      staffId: staff._id,
      email: staff.email,
      name: staff.name,
      department: staff.department,
      staffID: staff.staffID,
      role: staff.role || "STAFF",
      permissions: staff.permissions || [],
      isAdmin: staff.role === "ADMIN",
    };

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    logger.info("Staff login successful", {
      name: staff.name,
      // Email and staffID are not logged for security reasons
    });

    return NextResponse.json({
      success: true,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        department: staff.department,
        staffID: staff.staffID,
        role: staff.role || "STAFF",
        permissions: staff.permissions || [],
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Login error", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/auth/login",
      method: "POST",
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
