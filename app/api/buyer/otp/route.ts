import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "buyer") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Always validate ownership in DB — never trust client
    const generatedEmail = await prisma.generated_emails.findFirst({
      where: {
        id: Number(session.sub),
        is_active: true,
      },
    });

    if (!generatedEmail) {
      return NextResponse.json({ ok: false, error: "Email not found or inactive" }, { status: 404 });
    }

    // Separate query for otp_cache (one-to-one via unique FK)
    const otpCache = await prisma.otp_cache.findFirst({
      where: { generated_email_id: Number(session.sub) },
    });

    return NextResponse.json({
      ok: true,
      data: {
        latest_otp: otpCache?.latest_otp ?? null,
        source: otpCache?.source ?? null,
        updated_at: otpCache?.updated_at?.toISOString() ?? null,
        email: generatedEmail.generated_email,
      },
    });
  } catch (err) {
    console.error("[buyer/otp] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
