import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { SearchSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = SearchSchema.safeParse({
      query: searchParams.get("query") ?? "",
      page: searchParams.get("page") ?? 1,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { query, page } = parsed.data;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [emails, messages] = await Promise.all([
      prisma.generated_emails.findMany({
        where: { generated_email: { contains: query, mode: "insensitive" } },
        take: limit,
        skip,
        include: {
          buyer: { select: { username: true } },
          _count: { select: { inbox_messages: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.inbox_messages.findMany({
        where: {
          OR: [
            { sender: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { otp_code: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        include: { generated_email: { select: { generated_email: true } } },
        orderBy: { received_at: "desc" },
      }),
    ]);

    // Batch otp lookup
    const otpCaches = await prisma.otp_cache.findMany({
      where: { generated_email_id: { in: emails.map((e) => e.id) } },
      select: { generated_email_id: true, latest_otp: true },
    });
    const otpMap = new Map(otpCaches.map((o) => [o.generated_email_id, o.latest_otp]));

    return NextResponse.json({
      ok: true,
      data: {
        emails: emails.map((e) => ({
          id: e.id,
          generated_email: e.generated_email,
          is_active: e.is_active,
          buyer_username: e.buyer?.username ?? null,
          latest_otp: otpMap.get(e.id) ?? null,
          message_count: e._count.inbox_messages,
          created_at: e.created_at.toISOString(),
        })),
        messages: messages.map((m) => ({
          id: m.id,
          inbox_email: m.generated_email.generated_email,
          sender: m.sender,
          subject: m.subject,
          otp_code: m.otp_code,
          received_at: m.received_at.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("[superadmin/search] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
