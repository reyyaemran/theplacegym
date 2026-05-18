import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { checkPassword, hashPassword } from "@/lib/password";

/**
 * POST /api/auth/change-password
 * Self-service password change for logged-in staff.
 * Requires current password and new password.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let session: {
      staffId?: string;
      email?: string;
      name?: string;
      role?: string;
      isAdmin?: boolean;
    };
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    if (!session.staffId) {
      return NextResponse.json(
        { error: "No staff ID in session" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection("staff");

    // Find the staff member
    const staff = await collection.findOne({ _id: session.staffId } as any);
    if (!staff) {
      // Try by email as fallback
      const staffByEmail = await collection.findOne({
        email: session.email?.toLowerCase().trim(),
      });
      if (!staffByEmail) {
        return NextResponse.json(
          { error: "Staff member not found" },
          { status: 404 }
        );
      }
      // Verify current password
      const stored = (staffByEmail as any).password || (staffByEmail as any).staffID;
      if (!checkPassword(currentPassword, stored).ok) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
      // Update password (hashed)
      await collection.updateOne(
        { _id: staffByEmail._id },
        { $set: { password: hashPassword(newPassword), updatedAt: new Date().toISOString() } }
      );
    } else {
      // Verify current password
      const stored = (staff as any).password || (staff as any).staffID;
      if (!checkPassword(currentPassword, stored).ok) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
      // Update password (hashed)
      await collection.updateOne(
        { _id: staff._id },
        { $set: { password: hashPassword(newPassword), updatedAt: new Date().toISOString() } }
      );
    }

    logger.info("Staff password changed successfully", {
      name: session.name,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error changing password",
      errorMessage instanceof Error ? errorMessage : undefined,
      { endpoint: "/api/auth/change-password", method: "POST" }
    );
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
