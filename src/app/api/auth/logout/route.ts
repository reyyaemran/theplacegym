import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");

    logger.info("Staff logout successful");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Logout error", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/auth/logout",
      method: "POST",
    });
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    );
  }
}

