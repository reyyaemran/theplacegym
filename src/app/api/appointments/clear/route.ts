import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/appointments/clear
 * Clears all appointments from the database
 */
export async function DELETE(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection("appointments");

    // Count existing appointments
    const countBefore = await collection.countDocuments();

    if (countBefore === 0) {
      return NextResponse.json({
        success: true,
        message: "No appointments to clear. Database is already empty.",
        deletedCount: 0,
      });
    }

    // Delete all appointments
    const result = await collection.deleteMany({});

    // Verify deletion
    const countAfter = await collection.countDocuments();

    logger.info("Appointments cleared", {
      deletedCount: result.deletedCount,
      remainingCount: countAfter,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} appointment(s) from the database`,
      deletedCount: result.deletedCount,
      remainingCount: countAfter,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error clearing appointments",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/appointments/clear",
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to clear appointments" },
      { status: 500 }
    );
  }
}

