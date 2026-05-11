import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/health — Docker healthcheck + DB connectivity check
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        ts: new Date().toISOString(),
        version: process.env.APP_VERSION ?? "1.0.0",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[health] DB error:", err);
    return NextResponse.json(
      {
        status: "degraded",
        db: "disconnected",
        ts: new Date().toISOString(),
        error: "Database connection failed",
      },
      { status: 503 }
    );
  }
}
