import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { ObjectId } from "mongodb";

/**
 * GET /api/clients/[id]
 * Returns a single client (member) by ID. Verifies the member belongs
 * to the logged-in trainer via PT package assignment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let session: { name?: string; department?: string; isAdmin?: boolean; staffId?: string };
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection("members");

    // Find the member using multiple lookup strategies
    let member = await collection.findOne({ _id: id } as any);

    if (!member) {
      try {
        member = await collection.findOne({ _id: new ObjectId(id) } as any);
      } catch {
        // ObjectId conversion failed, continue
      }
    }

    if (!member) {
      member = await collection.findOne({ memberNumber: id } as any);
    }

    if (!member) {
      member = await collection.findOne({ customerNumber: id } as any);
    }

    if (!member) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // For PT/PTS, verify this member is actually their client
    if (
      session.department === "PT" ||
      session.department === "PTS"
    ) {
      const ptPackagesCollection = db.collection("pt-packages");
      const memberNumber =
        (member as any).memberNumber || (member as any).customerNumber;
      const trainerName = session.name?.trim();
      const trainerId = session.staffId;

      const orConditions: Record<string, unknown>[] = [];
      if (trainerName) {
        const escaped = trainerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orConditions.push({
          assignedStaffName: { $regex: new RegExp(`^${escaped}$`, "i") },
        });
      }
      if (trainerId) {
        orConditions.push({ assignedStaffId: trainerId });
      }

      const hasPackage =
        orConditions.length > 0
          ? await ptPackagesCollection.findOne({
              memberId: memberNumber,
              $or: orConditions,
            } as any)
          : null;

      if (!hasPackage) {
        return NextResponse.json(
          { error: "This member is not assigned to you" },
          { status: 403 }
        );
      }
    }

    // Transform for backward compatibility
    const transformedMember = {
      ...member,
      memberNumber:
        (member as any).memberNumber || (member as any).customerNumber,
    };

    return NextResponse.json(transformedMember);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching client",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: `/api/clients/${id}`,
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}
