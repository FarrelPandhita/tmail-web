import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// DELETE /api/admin/emails/bulk-delete — delete all emails older than 35 days (Superadmin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const thirtyFiveDaysAgo = new Date();
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

    const emailsToDelete = await prisma.generated_emails.findMany({
      where: { created_at: { lt: thirtyFiveDaysAgo } },
      select: { id: true, generated_email: true },
    });

    if (emailsToDelete.length === 0) {
      return NextResponse.json({ ok: true, deleted_count: 0 });
    }

    const emailIds = emailsToDelete.map((e) => e.id);

    await prisma.$transaction([
      prisma.inbox_messages.deleteMany({ where: { generated_email_id: { in: emailIds } } }),
      prisma.otp_cache.deleteMany({ where: { generated_email_id: { in: emailIds } } }),
      prisma.generated_emails.deleteMany({ where: { id: { in: emailIds } } }),
      prisma.audit_logs.create({
        data: {
          admin_id: Number(session.sub),
          action: "BULK_DELETE_OLD_EMAILS",
          target_email: `Deleted ${emailsToDelete.length} emails older than 35 days`,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, deleted_count: emailsToDelete.length });
  } catch (err) {
    console.error("[admin/emails/bulk-delete] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
