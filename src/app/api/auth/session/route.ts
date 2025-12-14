import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const sessionData = JSON.parse(session.value);
      return NextResponse.json({
        authenticated: true,
        staff: sessionData,
      });
    } catch (parseError) {
      // Invalid session data - return unauthenticated
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    // Error accessing cookies - return unauthenticated
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

