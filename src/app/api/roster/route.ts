import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { RosterRecord } from "@/types/roster";
import { logger } from "@/lib/logger";

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const staffId = searchParams.get("staffId");
    const startDate = searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // YYYY-MM-DD

    // Support either month/year or startDate/endDate range queries
    if (!startDate && (!month || !year)) {
      return NextResponse.json(
        { error: "Month/Year or startDate/endDate are required" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("roster GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("roster");

    let query: any = {};

    if (startDate) {
      // Date range query — dates are stored as "YYYY-MM-DD" strings, so $gte/$lte works
      query.date = { $gte: startDate };
      if (endDate) {
        query.date.$lte = endDate;
      }
    } else {
      // Original month/year regex query
      const formattedMonth = month!.padStart(2, "0");
      const dateRegex = `^${year}-${formattedMonth}-`;
      query.date = { $regex: dateRegex };
    }

    if (staffId) {
      query.staffId = staffId;
    }

    const roster = await collection.find(query).toArray() as unknown as RosterRecord[];

    return NextResponse.json(roster);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching roster", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/roster",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, date, status, shiftType, leaveType } = body;

    if (!staffId || !date || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("roster POST: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("roster");

    // Update or Insert (Upsert)
    const filter = { staffId, date };
    const update = {
      $set: {
        staffId,
        date,
        status,
        shiftType,
        leaveType,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    const result = await collection.updateOne(filter, update, { upsert: true });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error saving roster record", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/roster",
      method: "POST",
    });
    return NextResponse.json(
      { error: "Failed to save roster record" },
      { status: 500 }
    );
  }
}
