import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { AppointmentRequest, RequestStatus } from "@/types/request";
import { logger } from "@/lib/logger";
import { z } from "zod";

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

const requestSchema = z.object({
  requestType: z.enum(["CHANGE_DATE", "UNDO_SESSION", "CHANGE_PACKAGE", "EXTEND_PACKAGE", "CUT_SESSIONS", "OTHER"]),
  appointmentId: z.string().min(1, "Appointment ID is required"),
  ptPackageRecordId: z.string().optional(),
  requestedBy: z.string().min(1, "Requested by is required"),
  requestedByName: z.string().min(1, "Requested by name is required"),
  reason: z.string().min(1, "Reason is required"),
  newDate: z.string().optional(),
  newTime: z.string().optional(),
  additionalNotes: z.string().optional(),
});

// Generate unique request number (e.g., "REQ-2025-00001")
async function generateRequestNumber(db: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  // Find the latest request number for this year
  const collection = db.collection("requests");
  const latestRequest = await collection
    .find({ requestNumber: { $regex: `^${prefix}` } })
    .sort({ requestNumber: -1 })
    .limit(1)
    .toArray();

  let nextNumber = 1;
  if (latestRequest.length > 0 && latestRequest[0].requestNumber) {
    const lastNumber = parseInt(latestRequest[0].requestNumber.replace(prefix, ""));
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("requests GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("requests");

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const requestedBy = searchParams.get("requestedBy");
    const appointmentId = searchParams.get("appointmentId");

    const query: any = {};
    if (status) query.status = status;
    if (requestedBy) query.requestedBy = requestedBy;
    if (appointmentId) query.appointmentId = appointmentId;

    const requests = await collection.find(query).sort({ createdAt: -1 }).toArray() as unknown as AppointmentRequest[];

    return NextResponse.json(requests);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching requests",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/requests",
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid request data submitted", {
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    let db;
    try {
      db = await getDatabase();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error("requests POST: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("requests");

    // Generate unique request number
    const requestNumber = await generateRequestNumber(db);

    const appointmentRequest: Omit<AppointmentRequest, "_id"> = {
      ...validatedData,
      requestNumber,
      status: "PENDING" as RequestStatus,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(appointmentRequest as any);
    const createdRequest: AppointmentRequest = {
      _id: result.insertedId.toString(),
      ...appointmentRequest,
    };
    return NextResponse.json(createdRequest, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating request",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/requests",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}
