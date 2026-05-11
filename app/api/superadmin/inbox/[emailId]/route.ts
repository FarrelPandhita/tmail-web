import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { emailId: emailIdStr } = await params;
    const emailId = parseInt(emailIdStr, 10);

    const [email, otpCache] = await Promise.all([
      prisma.generated_emails.findUnique({
        where: { id: emailId },
        include: {
          buyer: { select: { username: true } },
          inbox_messages: {
            orderBy: { received_at: "desc" },
            take: 10,
          },
        },
      }),
      prisma.otp_cache.findFirst({
        where: { generated_email_id: emailId },
      }),
    ]);

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email not found" }, { status: 404 });
    }

    // Write audit log — ALL superadmin inbox API views are logged
    await prisma.audit_logs.create({
      data: {
        admin_id: Number(session.sub),
        action: "VIEW_INBOX",
        target_email: email.generated_email,
        created_at: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: email.id,
        generated_email: email.generated_email,
        is_active: email.is_active,
        created_at: email.created_at ? email.created_at.toISOString() : new Date().toISOString(),
        buyer_username: email.buyer?.username ?? null,
        latest_otp: otpCache?.latest_otp ?? null,
        otp_source: otpCache?.source ?? null,
        otp_updated_at: otpCache?.updated_at?.toISOString() ?? null,
        messages: email.inbox_messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          recipient: m.recipient,
          subject: m.subject,
          otp_code: m.otp_code,
          raw_body: m.raw_body,
          received_at: m.received_at ? m.received_at.toISOString() : new Date().toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[superadmin/inbox/[emailId]] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
