import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { RosterRecord } from "@/types/roster";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const staffId = searchParams.get("staffId");

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and Year are required" },
        { status: 400 }
      );
    }

    try {
      const db = await getDatabase();
      const collection = db.collection<RosterRecord>("roster");

      // Construct date query
      // We store dates as "YYYY-MM-DD" strings
      // Regex to match YYYY-MM-*
      const formattedMonth = month.padStart(2, "0");
      const dateRegex = `^${year}-${formattedMonth}-`;

      const query: any = {
        date: { $regex: dateRegex },
      };

      if (staffId) {
        query.staffId = staffId;
      }

      const roster = await collection.find(query).toArray();

      return NextResponse.json(roster);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check for MongoDB connection errors or missing URI
      if (errorMessage.includes("MONGODB_URI") || errorMessage.includes("MongoClient") || errorMessage.includes("connection")) {
        // Return empty array when MongoDB is not configured or connection fails
        logger.info("Using mock roster data (MongoDB not configured or connection failed)");
        return NextResponse.json([]);
      }
      throw error;
    }
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

    try {
      const db = await getDatabase();
      const collection = db.collection<RosterRecord>("roster");

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check for MongoDB connection errors or missing URI
      if (errorMessage.includes("MONGODB_URI") || errorMessage.includes("MongoClient") || errorMessage.includes("connection")) {
        // Return success in mock mode
        logger.info("Using mock mode for roster record creation (MongoDB not configured or connection failed)");
        return NextResponse.json({ success: true });
      }
      throw error;
    }
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

