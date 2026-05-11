import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { PaginationSchema } from "@/lib/validations";

const SUPERADMIN_PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = PaginationSchema.safeParse({
      page: searchParams.get("page") ?? 1,
      limit: SUPERADMIN_PAGE_SIZE,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid pagination" }, { status: 400 });
    }

    const { page } = parsed.data;
    const skip = (page - 1) * SUPERADMIN_PAGE_SIZE;

    const [emails, total] = await Promise.all([
      prisma.generated_emails.findMany({
        skip,
        take: SUPERADMIN_PAGE_SIZE,
        orderBy: { created_at: "desc" },
        include: {
          buyer: { select: { username: true } },
          _count: { select: { inbox_messages: true } },
          inbox_messages: {
            take: 10,
            orderBy: { received_at: "desc" },
            select: {
              id: true,
              sender: true,
              subject: true,
              otp_code: true,
              received_at: true,
            },
          },
        },
      }),
      prisma.generated_emails.count(),
    ]);

    // Batch fetch otp_cache
    const otpCaches = await prisma.otp_cache.findMany({
      where: { generated_email_id: { in: emails.map((e) => e.id) } },
      select: { generated_email_id: true, latest_otp: true, updated_at: true },
    });
    const otpMap = new Map(otpCaches.map((o) => [o.generated_email_id, o]));

    return NextResponse.json({
      ok: true,
      data: {
        emails: emails.map((e) => {
          const otp = otpMap.get(e.id);
          return {
            id: e.id,
            generated_email: e.generated_email,
            is_active: e.is_active,
            created_at: e.created_at.toISOString(),
            buyer_username: e.buyer?.username ?? null,
            latest_otp: otp?.latest_otp ?? null,
            otp_updated_at: otp?.updated_at?.toISOString() ?? null,
            message_count: e._count.inbox_messages,
            recent_messages: e.inbox_messages.map((m) => ({
              id: m.id,
              sender: m.sender,
              subject: m.subject,
              otp_code: m.otp_code,
              received_at: m.received_at.toISOString(),
            })),
          };
        }),
        pagination: {
          page,
          total,
          totalPages: Math.ceil(total / SUPERADMIN_PAGE_SIZE),
          hasMore: skip + SUPERADMIN_PAGE_SIZE < total,
        },
      },
    });
  } catch (err) {
    console.error("[superadmin/inbox] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
