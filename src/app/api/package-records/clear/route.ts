import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDatabase();
    const membershipsCollection = db.collection("memberships");
    const ptPackagesCollection = db.collection("pt-packages");

    // Count existing records
    const membershipCount = await membershipsCollection.countDocuments();
    const ptPackageCount = await ptPackagesCollection.countDocuments();

    // Delete all membership records
    const membershipResult = await membershipsCollection.deleteMany({});
    logger.info(`Deleted ${membershipResult.deletedCount} membership record(s)`);

    // Delete all PT package records
    const ptPackageResult = await ptPackagesCollection.deleteMany({});
    logger.info(`Deleted ${ptPackageResult.deletedCount} PT package record(s)`);

    return NextResponse.json({
      success: true,
      deletedCount: {
        memberships: membershipResult.deletedCount,
        ptPackages: ptPackageResult.deletedCount,
        total: membershipResult.deletedCount + ptPackageResult.deletedCount,
      },
      message: `Successfully cleared ${membershipResult.deletedCount} membership records and ${ptPackageResult.deletedCount} PT package records.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error clearing package records",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/package-records/clear",
        method: "DELETE",
      }
    );
    return NextResponse.json(
      { error: "Failed to clear package records" },
      { status: 500 }
    );
  }
}

