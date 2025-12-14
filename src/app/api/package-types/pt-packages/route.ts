import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { PTPackage } from "@/features/dashboard/pages/services/types/pt-package";
import { logger } from "@/lib/logger";
import { ptPackageTypeSchema } from "@/lib/validations/pt-package-type";

interface PTPackageQuery {
  search?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let packages: PTPackage[] = [];

    try {
      const db = await getDatabase();
      const collection = db.collection<PTPackage>("pt-package-types");

      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get("search");
      const status = searchParams.get("status");

      const query: PTPackageQuery = {};
      if (status && status !== "all") {
        query.status = status;
      }

      packages = await collection.find(query as any).sort({ sessions: 1 }).toArray();

      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        packages = packages.filter((pkg) => {
          const searchableFields = [
            pkg.name,
            pkg.shortName,
            pkg.description || "",
            pkg.sessions.toString(),
          ].map((field) => field.toLowerCase());

          return searchableFields.some((field) => field.includes(searchLower));
        });
      }

      // Apply status filter
      if (status === "active") {
        packages = packages.filter((pkg) => pkg.isActive);
      } else if (status === "inactive") {
        packages = packages.filter((pkg) => !pkg.isActive);
      }
    } catch (error: unknown) {
        throw error;
    }

    return NextResponse.json(packages);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching PT packages", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/package-types/pt-packages",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch PT packages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = ptPackageTypeSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid PT package data submitted", {
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
    const ptPackage: Omit<PTPackage, "id"> = {
      ...validatedData,
      pricePerSession: validatedData.pricePerSession || validatedData.price / validatedData.sessions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    const collection = db.collection<PTPackage>("pt-package-types");
    const packageWithId: PTPackage = {
      id: `pt${Date.now()}`,
      ...ptPackage,
    };
    const result = await collection.insertOne(packageWithId as any);
    const createdPackage: PTPackage = {
      ...packageWithId,
      id: result.insertedId.toString(),
    };
    return NextResponse.json(createdPackage, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating PT package",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/package-types/pt-packages",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create PT package" },
      { status: 500 }
    );
  }
}
