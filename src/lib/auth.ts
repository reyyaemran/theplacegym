import { NextRequest, NextResponse } from "next/server";
import { StaffPermission } from "@/types/staff";

export interface SessionData {
  staffId?: string;
  email?: string;
  name?: string;
  department?: string;
  staffID?: string;
  role?: string;
  permissions?: StaffPermission[];
  isAdmin?: boolean;
}

export function getSession(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get("session");
  if (!sessionCookie?.value) return null;

  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch {
    return null;
  }
}

export function isAdminSession(session: SessionData): boolean {
  return (
    session.isAdmin === true ||
    session.role === "SUPERADMIN" ||
    session.role === "ADMIN"
  );
}

export function isPlatformAdmin(session: SessionData): boolean {
  return session.role === "SUPERADMIN";
}

export function hasPermission(
  session: SessionData,
  permission: StaffPermission
): boolean {
  if (isAdminSession(session)) return true;
  return session.permissions?.includes(permission) ?? false;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Insufficient permissions") {
  return NextResponse.json({ error: message }, { status: 403 });
}
