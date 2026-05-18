import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";

export async function PATCH(
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

    // Mark note as read
    await db
      .collection("staff_notes")
      .updateOne({ _id: new ObjectId(id) }, { $set: { read: true } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Staff note PATCH error:", error);
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

    await db.collection("staff_notes").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Staff note DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
