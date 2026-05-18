import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// In-memory cache: staffId -> { avatar, exp } - avoids DB hit on repeated session checks
const AVATAR_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min
const avatarCache = new Map<string, { avatar: string; exp: number }>();

function getCachedAvatar(staffId: string): string | undefined {
  const entry = avatarCache.get(staffId);
  if (!entry || Date.now() > entry.exp) {
    if (entry) avatarCache.delete(staffId);
    return undefined;
  }
  return entry.avatar;
}

function setCachedAvatar(staffId: string, avatar: string): void {
  avatarCache.set(staffId, { avatar, exp: Date.now() + AVATAR_CACHE_TTL_MS });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const sessionData = JSON.parse(session.value);
      const staffId = sessionData?.staffId;

      // Enrich with avatar (from cache or DB) - not in cookie (can be huge base64)
      if (typeof staffId === "string" && staffId && sessionData.role !== "SUPERADMIN") {
        const cached = getCachedAvatar(staffId);
        if (cached !== undefined) {
          sessionData.avatar = cached;
        } else {
          try {
            const { getDatabase } = await import("@/lib/mongodb");
            const { ObjectId } = await import("mongodb");
            if (ObjectId.isValid(staffId)) {
              const db = await getDatabase();
              const doc = await db.collection("staff").findOne(
                { _id: new ObjectId(staffId) } as any,
                { projection: { avatar: 1 } }
              );
              const avatar = (doc as { avatar?: string })?.avatar;
              if (avatar) {
                sessionData.avatar = avatar;
                setCachedAvatar(staffId, avatar);
              }
            }
          } catch {
            /* ignore */
          }
        }
      }

      return NextResponse.json({
        authenticated: true,
        staff: sessionData,
      });
    } catch (parseError) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

