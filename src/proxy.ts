/**
 * Next.js 16 edge proxy — auth guards for dashboard and API routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/health",
];

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isPublic && !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Signup/onboarding removed — send old links to login
  if (
    pathname === "/signup" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/dashboard/settings")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    pathname.startsWith("/dashboard/reports/revenue") ||
    pathname.startsWith("/dashboard/reports/sales") ||
    pathname.startsWith("/dashboard/reports/customer-insights")
  ) {
    return NextResponse.redirect(new URL("/dashboard/membership-invoice", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
