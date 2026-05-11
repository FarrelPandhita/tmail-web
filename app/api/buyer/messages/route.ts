import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

const BUYER_MAX_MESSAGES = 3;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "buyer") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Ownership validated: only messages belonging to this buyer's generated_email
    const generatedEmail = await prisma.generated_emails.findFirst({
      where: {
        id: Number(session.sub),
        is_active: true,
      },
    });

    if (!generatedEmail) {
      return NextResponse.json({ ok: false, error: "Email not found or inactive" }, { status: 404 });
    }

    const messages = await prisma.inbox_messages.findMany({
      where: { generated_email_id: Number(session.sub) },
      orderBy: { received_at: "desc" },
      take: BUYER_MAX_MESSAGES, // HARD server-side limit: cannot be overridden by client
      select: {
        id: true,
        sender: true,
        subject: true,
        otp_code: true,
        received_at: true,
        raw_body: false, // Don't send raw body in list view
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          subject: m.subject,
          otp_code: m.otp_code,
          received_at: m.received_at ? m.received_at.toISOString() : new Date().toISOString(),
          has_body: true,
        })),
        email: generatedEmail.generated_email,
      },
    });
  } catch (err) {
    console.error("[buyer/messages] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
