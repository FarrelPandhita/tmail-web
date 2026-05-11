import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes and their required roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/dashboard": ["buyer"],
  "/generator": ["generator_admin", "superadmin"],
  "/superadmin": ["superadmin"],
};

const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/auth/logout", "/api/health"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  // Not authenticated → redirect to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(session.role)) {
        // Role mismatch → redirect to their own dashboard
        return NextResponse.redirect(
          new URL(getRoleDashboard(session.role), req.url)
        );
      }
      break;
    }
  }

  // API route protection
  if (pathname.startsWith("/api/buyer") && session.role !== "buyer") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (
    pathname.startsWith("/api/admin") &&
    !["generator_admin", "superadmin"].includes(session.role)
  ) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (
    pathname.startsWith("/api/superadmin") &&
    session.role !== "superadmin"
  ) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

function getRoleDashboard(role: string): string {
  switch (role) {
    case "superadmin":
      return "/superadmin";
    case "generator_admin":
      return "/generator";
    case "buyer":
      return "/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
