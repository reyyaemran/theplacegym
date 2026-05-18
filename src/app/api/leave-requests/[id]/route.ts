import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSession, isAdminSession } from "@/lib/auth";

const SUPERVISOR_DEPARTMENTS = ["PTS", "CCS", "CM", "ASM"];

function isSupervisor(session: { department?: string }) {
  return session.department && SUPERVISOR_DEPARTMENTS.includes(session.department);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canReview = isAdminSession(session) || isSupervisor(session);
    if (!canReview) {
      return NextResponse.json(
        { error: "Only admins or supervisors (PTS, CCS, CM, ASM) can review leave requests" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reviewNote } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status (APPROVED/REJECTED) is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const existing = await db
      .collection("leave_requests")
      .findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    const update = {
      $set: {
        status,
        reviewedBy: session.staffId || session.email,
        reviewedByName: session.name || "Admin",
        reviewNote: reviewNote || "",
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const result = await db
      .collection("leave_requests")
      .findOneAndUpdate({ _id: new ObjectId(id) }, update, {
        returnDocument: "after",
      });

    if (!result) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Notify the requester via staff_note so it appears in their notifications
    const requesterStaffId = existing.staffId as string;
    if (requesterStaffId && session.staffId !== requesterStaffId) {
      const verb = status === "APPROVED" ? "approved" : "rejected";
      const dateRange = `${existing.startDate} to ${existing.endDate}`;
      const message = `Your leave request (${dateRange}) was ${verb} by ${result.reviewedByName}.${result.reviewNote ? ` Note: ${result.reviewNote}` : ""}`;
      await db.collection("staff_notes").insertOne({
        fromStaffId: session.staffId || "system",
        fromStaffName: result.reviewedByName || "Supervisor",
        toStaffId: requesterStaffId,
        toStaffName: existing.staffName || "Staff",
        message,
        read: false,
        createdAt: new Date(),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Leave request PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDatabase();

    // Staff can only delete their own pending requests; admins can delete any
    const filter: Record<string, unknown> = { _id: new ObjectId(id) };
    if (!isAdminSession(session)) {
      filter.staffId = session.staffId;
      filter.status = "PENDING";
    }

    const result = await db.collection("leave_requests").deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Leave request not found or cannot be deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Leave request DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
