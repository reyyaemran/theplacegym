import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { mockPTPackageRecords } from "@/features/dashboard/pages/ptpackage-invoice/data/mock-pt-package-records";
import { logger } from "@/lib/logger";
import { ptPackageRecordSchema } from "@/lib/validations/pt-package-record";

interface PTPackageQuery {
  memberId?: string;
  memberName?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let records: PTPackageRecord[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection<PTPackageRecord>("pt-packages");

      const searchParams = request.nextUrl.searchParams;
      const memberId = searchParams.get("memberId");
      const memberName = searchParams.get("memberName");

      const query: PTPackageQuery = {};
      if (memberId) query.memberId = memberId;
      if (memberName) query.memberName = memberName;

      records = await collection.find(query as any).sort({ startDate: -1 }).toArray();

      // Apply search filter if provided
      const search = searchParams.get("search");
      if (search) {
        const searchLower = search.toLowerCase();
        records = records.filter((record) => {
          const searchableFields = [
            record.memberId,
            record.memberName,
            record.invoiceNumber,
            record.ptPackageName,
          ].map((field) => field.toLowerCase());

          return searchableFields.some((field) => field.includes(searchLower));
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Check for MongoDB connection errors or missing URI
      if (errorMessage.includes("MONGODB_URI") || errorMessage.includes("MongoClient") || errorMessage.includes("connection")) {
        logger.info("Using mock PT package records data (MongoDB not configured or connection failed)");
        records = [...mockPTPackageRecords];

        // Apply filters to mock data
        const searchParams = request.nextUrl.searchParams;
        const memberId = searchParams.get("memberId");
        const memberName = searchParams.get("memberName");
        const search = searchParams.get("search");

        if (memberId) {
          records = records.filter((r) => r.memberId === memberId);
        }
        if (memberName) {
          records = records.filter((r) => r.memberName === memberName);
        }
        if (search) {
          const searchLower = search.toLowerCase();
          records = records.filter((record) => {
            const searchableFields = [
              record.memberId,
              record.memberName,
              record.invoiceNumber,
              record.ptPackageName,
            ].map((field) => field.toLowerCase());

            return searchableFields.some((field) => field.includes(searchLower));
          });
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json(records);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching PT package records", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/pt-packages",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch PT package records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = ptPackageRecordSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid PT package record data submitted", {
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
    const record: Omit<PTPackageRecord, "id"> = {
      ...validatedData,
    };

    try {
      const db = await getDatabase();
      const collection = db.collection<PTPackageRecord>("pt-packages");
      const recordWithId: PTPackageRecord = {
        id: `pt-package-${Date.now()}`,
        ...record,
      };
      const result = await collection.insertOne(recordWithId as any);
      const createdRecord: PTPackageRecord = {
        ...recordWithId,
        id: result.insertedId.toString(),
      };
      return NextResponse.json(createdRecord, { status: 201 });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("MONGODB_URI")) {
        logger.info("Using mock mode for PT package record creation");
        const mockRecord: PTPackageRecord = {
          id: `pt-package-${Date.now()}`,
          ...record,
        };
        return NextResponse.json(mockRecord, { status: 201 });
      }
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating PT package record",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/pt-packages",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create PT package record" },
      { status: 500 }
    );
  }
}

