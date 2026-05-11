import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/superadmin/stats — dashboard summary statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEmails, activeEmails, totalBuyers, messagesToday] =
      await Promise.all([
        prisma.generated_emails.count(),
        prisma.generated_emails.count({ where: { is_active: true } }),
        prisma.buyers.count({ where: { is_active: true } }),
        prisma.inbox_messages.count({
          where: { received_at: { gte: today } },
        }),
      ]);

    return NextResponse.json({
      ok: true,
      data: {
        total_emails: totalEmails,
        active_emails: activeEmails,
        total_buyers: totalBuyers,
        total_messages_today: messagesToday,
      },
    });
  } catch (err) {
    console.error("[superadmin/stats] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
