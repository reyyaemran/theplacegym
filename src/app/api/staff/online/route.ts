import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);

    const onlineStaff = await db
      .collection("staff")
      .find(
        { lastActive: { $gte: threshold }, loginEnabled: { $ne: false } },
        {
          projection: {
            _id: 1,
            name: 1,
            department: 1,
            avatar: 1,
            email: 1,
            lastActive: 1,
          },
        }
      )
      .sort({ lastActive: -1 })
      .toArray();

    return NextResponse.json(onlineStaff);
  } catch (error) {
    console.error("Online staff error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
