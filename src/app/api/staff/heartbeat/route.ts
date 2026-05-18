import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffId = session.staffId;
    if (!staffId) {
      // SuperAdmin doesn't have a staffId — just acknowledge
      return NextResponse.json({ ok: true });
    }

    const db = await getDatabase();
    const { ObjectId } = await import("mongodb");

    await db.collection("staff").updateOne(
      { _id: new ObjectId(staffId) },
      { $set: { lastActive: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
