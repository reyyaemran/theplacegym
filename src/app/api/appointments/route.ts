import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Appointment } from "@/types/appointment";
import { logger } from "@/lib/logger";
import { appointmentSchema } from "@/lib/validations/appointment";

function dbUnavailable() {
  return NextResponse.json(
    { error: "Database unavailable. Please try again shortly." },
    { status: 503 }
  );
}

interface AppointmentQuery {
  trainerId?: string;
  clientId?: string;
  status?: string;
  date?: string;
}

// Generate unique appointment number (e.g., "APT-2025-00001")
async function generateAppointmentNumber(db: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APT-${year}-`;
  
  // Find the latest appointment number for this year
  const collection = db.collection("appointments");
  const latestAppointment = await collection
    .find({ appointmentNumber: { $regex: `^${prefix}` } })
    .sort({ appointmentNumber: -1 })
    .limit(1)
    .toArray();
  
  let nextNumber = 1;
  if (latestAppointment.length > 0 && latestAppointment[0].appointmentNumber) {
    const lastNumber = parseInt(latestAppointment[0].appointmentNumber.replace(prefix, ""));
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
      logger.error("appointments GET: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("appointments");

    const searchParams = request.nextUrl.searchParams;
    const trainerId = searchParams.get("trainerId");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const query: any = {};
    if (trainerId) query.staffId = trainerId;
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;
    if (date) query.date = date;

    const rawAppointments = await collection.find(query as any).sort({ date: -1, startTime: 1 }).toArray();
    const appointments = rawAppointments.map((apt: any) => ({
      ...apt,
      _id: apt._id?.toString(),
    })) as Appointment[];

    return NextResponse.json(appointments);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error fetching appointments",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/appointments",
        method: "GET",
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = appointmentSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid appointment data submitted", {
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
      logger.error("appointments POST: database unavailable", undefined, { message: msg });
      return dbUnavailable();
    }

    const collection = db.collection("appointments");

    // Generate unique appointment number
    const appointmentNumber = await generateAppointmentNumber(db);

    const appointment: Omit<Appointment, "_id"> = {
      ...validatedData,
      appointmentNumber,
      date: validatedData.date,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(appointment as any);
    const createdAppointment: Appointment = {
      _id: result.insertedId.toString(),
      ...appointment,
    };
    return NextResponse.json(createdAppointment, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating appointment",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/appointments",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

