import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export type UserRole = "buyer" | "generator_admin" | "superadmin";

export interface SessionPayload extends JWTPayload {
  sub: string;
  role: UserRole;
  email: string;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "CHANGE_ME_IN_PRODUCTION_MINIMUM_32_CHARS_SECRET"
);

const COOKIE_NAME = "tmail_session";
const BUYER_TTL = 60 * 60 * 8; // 8 hours
const ADMIN_TTL = 60 * 60 * 4; // 4 hours

// ─── Sign ────────────────────────────────────────────────────────────────────

export async function signToken(payload: Omit<SessionPayload, "iat" | "exp">) {
  const isAdmin =
    payload.role === "superadmin" || payload.role === "generator_admin";
  const ttl = isAdmin ? ADMIN_TTL : BUYER_TTL;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(secret);
}

// ─── Verify ──────────────────────────────────────────────────────────────────

export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Set Cookie ──────────────────────────────────────────────────────────────

export async function setSessionCookie(
  payload: Omit<SessionPayload, "iat" | "exp">
) {
  const token = await signToken(payload);
  const isAdmin =
    payload.role === "superadmin" || payload.role === "generator_admin";
  const maxAge = isAdmin ? ADMIN_TTL : BUYER_TTL;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

// ─── Clear Cookie ────────────────────────────────────────────────────────────

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ─── Get Session ─────────────────────────────────────────────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Get Session from Request ────────────────────────────────────────────────

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
