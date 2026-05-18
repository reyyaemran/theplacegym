import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession, isAdminSession } from "@/lib/auth";

const SUPERVISOR_DEPARTMENTS = ["PTS", "CCS", "CM", "ASM"];

function isSupervisor(session: { department?: string }) {
  return session.department && SUPERVISOR_DEPARTMENTS.includes(session.department);
}

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const staffId = searchParams.get("staffId");

    const db = await getDatabase();
    const filter: Record<string, unknown> = {};

    // Supervisors see all PENDING requests (to approve); admins see all
    if (isAdminSession(session)) {
      if (staffId) filter.staffId = staffId;
      if (status) filter.status = status;
    } else if (isSupervisor(session) && status === "PENDING") {
      filter.status = "PENDING";
    } else {
      filter.staffId = session.staffId;
      if (status) filter.status = status;
    }

    const requests = await db
      .collection("leave_requests")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Leave requests GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session || !session.staffId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { leaveType, startDate, endDate, reason } = body;

    if (!leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Leave type, start date, and end date are required" },
        { status: 400 }
      );
    }
    const reasonStr = typeof reason === "string" ? reason.trim() : "";
    if (!reasonStr) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const leaveRequest = {
      staffId: session.staffId,
      staffName: session.name || "Unknown",
      department: session.department || "",
      leaveType,
      startDate,
      endDate,
      reason: reasonStr,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("leave_requests").insertOne(leaveRequest);

    return NextResponse.json(
      { ...leaveRequest, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Leave requests POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
