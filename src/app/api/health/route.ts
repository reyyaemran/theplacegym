import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

/**
 * Health check endpoint
 * Tests MongoDB connection and returns status
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: "ok",
      mongodb: "unknown",
    },
    version: "1.0.0",
  };

  // Test MongoDB connection
  try {
    const db = await getDatabase();
    await db.admin().ping();
    health.services.mongodb = "connected";
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("MONGODB_URI")) {
      health.services.mongodb = "not_configured";
      health.status = "ok"; // App works with mock data
    } else {
      health.services.mongodb = "error";
      health.status = "degraded";
    }
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}

