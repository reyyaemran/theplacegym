import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { Member } from "@/features/dashboard/pages/members/types/member";
import { logger } from "@/lib/logger";
import { memberSchema } from "@/lib/validations/member";

interface MemberQuery {
  search?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    let members: Member[] = [];

    const db = await getDatabase();
    const collection = db.collection("members");
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const query: MemberQuery = {};
    if (status) query.status = status;

    // For PT/PTS: return only members assigned to this trainer (have PT packages with assignedStaffName/assignedStaffId)
    let memberIdFilter: (string | number)[] | null = null;
    const sessionCookie = request.cookies.get("session");
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value) as {
          department?: string;
          name?: string;
          staffId?: string;
        };
        const department = session.department;
        const isTrainer = department === "PT" || department === "PTS";

        if (isTrainer) {
          const ptPackagesCollection = db.collection("pt-packages");
          const trainerName = session.name?.trim();
          const trainerId = session.staffId != null ? String(session.staffId) : undefined;
          const conditions: Record<string, unknown>[] = [];
          if (trainerName) {
            const escaped = trainerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            conditions.push({
              assignedStaffName: { $exists: true, $nin: [null, ""], $regex: new RegExp(`^${escaped}$`, "i") },
            });
          }
          if (trainerId) {
            const idConditions: Record<string, unknown>[] = [{ assignedStaffId: trainerId }];
            if (ObjectId.isValid(trainerId) && new ObjectId(trainerId).toString() === trainerId) {
              idConditions.push({ assignedStaffId: new ObjectId(trainerId) });
            }
            conditions.push(idConditions.length > 1 ? { $or: idConditions } : idConditions[0]!);
          }
          const packageQuery = conditions.length > 1 ? { $or: conditions } : conditions.length === 1 ? conditions[0]! : null;
          if (packageQuery) {
            const trainerPackages = await ptPackagesCollection.find(packageQuery as any).toArray();
            const memberIdSet = new Set<string | number>();
            for (const pkg of trainerPackages) {
              const id = pkg.memberId;
              if (id != null && id !== "") {
                memberIdSet.add(id);
                if (typeof id === "string" && /^\d+$/.test(id)) memberIdSet.add(parseInt(id, 10));
              }
            }
            memberIdFilter = [...memberIdSet];
          } else {
            memberIdFilter = [];
          }
        }
      } catch {
        // Ignore session parse errors
      }
    }

    const findQuery: Record<string, unknown> = { ...query };
    if (memberIdFilter !== null) {
      if (memberIdFilter.length === 0) {
        return NextResponse.json([]);
      }
      findQuery.$or = [
        { memberNumber: { $in: memberIdFilter } },
        { customerNumber: { $in: memberIdFilter } },
      ];
    }

    const rawMembers = await collection.find(findQuery).sort({ dateJoined: -1 }).toArray() as any[];

    members = rawMembers.map((member: any) => ({
      ...member,
      id: member.id || member._id?.toString(),
      memberNumber: member.memberNumber || member.customerNumber,
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      members = members.filter((member) => {
        const searchableFields = [
          member.memberNumber,
          member.fullName,
          member.email || "",
          member.company || "",
          member.location || "",
        ].map((field) => String(field || "").toLowerCase());
        return searchableFields.some((field) => field.includes(searchLower));
      });
    }

    return NextResponse.json(members);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error("Error fetching members", errorMessage instanceof Error ? errorMessage : undefined, {
      endpoint: "/api/members",
      method: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = memberSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid member data submitted", {
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
    const member = {
      ...validatedData,
      dateJoined: validatedData.dateJoined ? new Date(validatedData.dateJoined).toISOString() : new Date().toISOString(),
    } as Omit<Member, "id">;

    try {
      const db = await getDatabase();
      const collection = db.collection("members");
      const memberWithId: Member & { customerNumber?: string } = {
        id: `member-${Date.now()}`,
        ...member,
        // Set customerNumber to match memberNumber for backward compatibility with unique index
        customerNumber: member.memberNumber,
      };
      const result = await collection.insertOne(memberWithId as any);
      const createdMember: Member = {
        ...memberWithId,
        id: result.insertedId.toString(),
      };
      return NextResponse.json(createdMember, { status: 201 });
    } catch (error: unknown) {
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    logger.error(
      "Error creating member",
      errorMessage instanceof Error ? errorMessage : undefined,
      {
        endpoint: "/api/members",
        method: "POST",
      }
    );
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}
