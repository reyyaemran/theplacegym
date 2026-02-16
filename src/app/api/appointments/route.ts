import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Appointment } from "@/types/appointment";
import { mockAppointments } from "@/lib/mock-data";
import { logger } from "@/lib/logger";
import { appointmentSchema } from "@/lib/validations/appointment";

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
    let appointments: Appointment[] = [];

    try {
      const db = await getDatabase();
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

      appointments = await collection.find(query as any).sort({ date: -1, startTime: 1 }).toArray() as unknown as Appointment[];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check for MongoDB connection errors or missing URI
      if (errorMessage.includes("MONGODB_URI") || errorMessage.includes("MongoClient") || errorMessage.includes("connection")) {
        logger.info("Using mock appointments data (MongoDB not configured or connection failed)");
        appointments = [...mockAppointments];

        // Apply filters to mock data
        const searchParams = request.nextUrl.searchParams;
        const trainerId = searchParams.get("trainerId");
        const clientId = searchParams.get("clientId");
        const status = searchParams.get("status");
        const date = searchParams.get("date");

        if (trainerId) {
          appointments = appointments.filter((a) => a.staffId === trainerId);
        }
        if (clientId) {
          appointments = appointments.filter((a) => a.clientId === clientId);
        }
        if (status) {
          appointments = appointments.filter((a) => a.status === status);
        }
        if (date) {
          appointments = appointments.filter((a) => {
            const appointmentDate = new Date(a.date).toISOString().split("T")[0];
            return appointmentDate === date;
          });
        }
      } else {
        throw error;
      }
    }

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

    try {
      const db = await getDatabase();
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock mode for appointment creation");
        
        // Generate mock appointment number
        const year = new Date().getFullYear();
        const mockNumber = `APT-${year}-${Date.now().toString().slice(-5)}`;
        
        const appointment: Omit<Appointment, "_id"> = {
          ...validatedData,
          appointmentNumber: mockNumber,
          date: validatedData.date,
          createdAt: new Date(),
        };
        
        const mockAppointment: Appointment = {
          _id: `apt-${Date.now()}`,
          ...appointment,
        };
        return NextResponse.json(mockAppointment, { status: 201 });
      }
      throw error;
    }
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

