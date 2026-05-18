import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Staff } from "@/types/staff";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { checkPassword, hashPassword } from "@/lib/password";

interface LoginRequest {
  email?: string;
  password?: string;
  staffID?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email } = body;
    const passwordInput = body.password || body.staffID;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!passwordInput) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── DB lookup. If the DB is unavailable, surface that clearly — we no
    //    longer fall back to mock data.
    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("Login: database unavailable", undefined, { message: msg });
      return NextResponse.json(
        { error: "Database unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    // Platform super-admin (legacy `users` collection — not in `staff`).
    const superAdmin = await db.collection("users").findOne({
      email: normalizedEmail,
      role: "SUPERADMIN",
    });
    if (superAdmin) {
      const { ok, needsUpgrade } = checkPassword(
        passwordInput,
        superAdmin.password as string | undefined
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const sessionData = {
        email: superAdmin.email,
        name: superAdmin.name || "Super Admin",
        role: "SUPERADMIN",
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

      if (needsUpgrade) {
        try {
          await db.collection("users").updateOne(
            { _id: superAdmin._id },
            { $set: { password: hashPassword(passwordInput) } }
          );
        } catch {
          // non-critical
        }
      }

      logger.info("Super admin login successful");
      return NextResponse.json({
        success: true,
        staff: {
          name: sessionData.name,
          email: sessionData.email,
          role: sessionData.role,
        },
      });
    }

    const staff = (await db.collection("staff").findOne({
      email: normalizedEmail,
    })) as Staff | null;

    if (!staff) {
      // Keep generic to avoid email enumeration.
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Password check. Supports hashed rows, legacy plaintext, and staff with
    // no password yet (default credential is their staffID).
    let ok = false;
    let needsUpgrade = false;
    if (staff.password) {
      ({ ok, needsUpgrade } = checkPassword(passwordInput, staff.password));
    } else if (staff.staffID) {
      ok = passwordInput === staff.staffID;
      needsUpgrade = ok;
    }
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (staff.loginEnabled === false) {
      return NextResponse.json(
        {
          error:
            "Login access is disabled for this account. Please contact your manager.",
        },
        { status: 403 }
      );
    }

    const sessionData = {
      staffId: staff._id != null ? String(staff._id) : undefined,
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

    // Background bookkeeping: upgrade legacy passwords + bump lastActive.
    // Non-critical — failures shouldn't block login.
    try {
      const { ObjectId } = await import("mongodb");
      const updates: Record<string, unknown> = { lastActive: new Date() };
      if (needsUpgrade) {
        updates.password = hashPassword(passwordInput);
        logger.info("Upgraded legacy plaintext password", { email: staff.email });
      }
      await db.collection("staff").updateOne(
        { _id: new ObjectId(staff._id as string) },
        { $set: updates }
      );
    } catch {
      // non-critical
    }

    logger.info("Staff login successful", { name: staff.name });

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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Login error", err, { endpoint: "/api/auth/login" });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
