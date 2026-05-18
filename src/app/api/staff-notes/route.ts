import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = session.staffId;
    const direction = searchParams.get("direction") || "received"; // "received" | "sent"

    if (!staffId) {
      return NextResponse.json([]);
    }

    const db = await getDatabase();
    const filter =
      direction === "sent"
        ? { fromStaffId: staffId }
        : { toStaffId: staffId };

    const notes = await db
      .collection("staff_notes")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Staff notes GET error:", error);
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
    const { toStaffId, toStaffName, message } = body;

    if (!toStaffId || !message) {
      return NextResponse.json(
        { error: "Recipient and message are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const note = {
      fromStaffId: session.staffId,
      fromStaffName: session.name || "Unknown",
      toStaffId,
      toStaffName: toStaffName || "Unknown",
      message,
      read: false,
      createdAt: new Date(),
    };

    const result = await db.collection("staff_notes").insertOne(note);

    return NextResponse.json(
      { ...note, _id: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Staff notes POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
