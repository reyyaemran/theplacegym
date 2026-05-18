import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { Member } from "@/features/dashboard/pages/members/types/member";
import { logger } from "@/lib/logger";

/**
 * GET /api/clients
 *
 * For PT/PTS: Returns members that have PT packages assigned to the logged-in trainer.
 * For Admin/SuperAdmin: Returns all members that have any PT package assignment.
 *   - Optionally filter by ?trainer=<name> to see a specific trainer's clients.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let session: {
      name?: string;
      department?: string;
      isAdmin?: boolean;
      role?: string;
      staffId?: string;
    };
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const isAdmin =
      session.isAdmin ||
      session.role === "SUPERADMIN" ||
      session.role === "ADMIN";
    const department = session.department;
    const isTrainer = department === "PT" || department === "PTS";

    // Must be admin or trainer
    if (!isAdmin && !isTrainer) {
      return NextResponse.json(
        { error: "This endpoint is only for trainers (PT/PTS) or admins" },
        { status: 403 }
      );
    }

    const db = await getDatabase();
    const ptPackagesCollection = db.collection("pt-packages");

    const searchParams = request.nextUrl.searchParams;
    const trainerFilter = searchParams.get("trainer");
    const search = searchParams.get("search");

    let packageQuery: Record<string, unknown> = {};

    // PT/PTS always see only their assigned clients (regardless of admin role)
    if (isTrainer) {
      const trainerName = session.name?.trim();
      const trainerId = session.staffId != null ? String(session.staffId) : undefined;
      const conditions: Record<string, unknown>[] = [];
      if (trainerName) {
        const escaped = trainerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Require assignedStaffName exists, is non-empty, and matches trainer (case-insensitive)
        conditions.push({
          assignedStaffName: {
            $exists: true,
            $nin: [null, ""],
            $regex: new RegExp(`^${escaped}$`, "i"),
          },
        });
      }
      if (trainerId) {
        // Match by staff ID (DB may store as string or ObjectId)
        const idConditions: Record<string, unknown>[] = [{ assignedStaffId: trainerId }];
        try {
          if (ObjectId.isValid(trainerId) && new ObjectId(trainerId).toString() === trainerId) {
            idConditions.push({ assignedStaffId: new ObjectId(trainerId) });
          }
        } catch {
          // Not a valid ObjectId, use string only
        }
        conditions.push(idConditions.length > 1 ? { $or: idConditions } : idConditions[0]!);
      }
      if (conditions.length > 1) {
        packageQuery = { $or: conditions };
      } else if (conditions.length === 1) {
        packageQuery = conditions[0]!;
      } else {
        // No identifier — return no clients
        return NextResponse.json([]);
      }
    } else if (trainerFilter) {
      // Admin filtering by a specific trainer (by name)
      const escaped = trainerFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      packageQuery = {
        assignedStaffName: { $regex: new RegExp(`^${escaped}$`, "i") },
      };
    } else {
      // Admin with no filter → all packages with an assignedStaffName
      packageQuery = { assignedStaffName: { $exists: true, $ne: "" } };
    }

    const trainerPackages = await ptPackagesCollection
      .find(packageQuery)
      .toArray();

    // Get unique member IDs (support both string and number for memberNumber/customerNumber)
    const memberIdSet = new Set<string | number>();
    for (const pkg of trainerPackages) {
      const id = pkg.memberId;
      if (id != null && id !== "") {
        memberIdSet.add(id);
        if (typeof id === "string" && /^\d+$/.test(id)) {
          memberIdSet.add(parseInt(id, 10));
        }
      }
    }
    const memberIds = [...memberIdSet];

    if (memberIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch matching members (memberNumber/customerNumber may be string or number)
    const membersCollection = db.collection("members");
    const rawMembers = await membersCollection
      .find({
        $or: [
          { memberNumber: { $in: memberIds } },
          { customerNumber: { $in: memberIds } },
        ],
      })
      .sort({ dateJoined: -1 })
      .toArray();

    // Transform for backward compatibility
    let members: Member[] = rawMembers.map((member: any) => ({
      ...member,
      memberNumber: member.memberNumber || member.customerNumber,
    }));

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      members = members.filter((member) => {
        const searchableFields = [
          member.memberNumber,
          member.fullName,
          member.email || "",
          member.company || "",
          member.location || "",
        ].map((field) => field.toLowerCase());

        return searchableFields.some((field) => field.includes(searchLower));
      });
    }

    return NextResponse.json(members);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching clients",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/clients",
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
