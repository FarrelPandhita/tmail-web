import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { GenerateEmailSchema } from "@/lib/validations";
import { hash } from "argon2";

// GET /api/admin/emails — list all generated emails
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const emails = await prisma.generated_emails.findMany({
      orderBy: { created_at: "desc" },
      include: {
        buyer: { select: { username: true } },
        _count: { select: { inbox_messages: true } },
      },
    });

    // Fetch otp_cache for all emails in one query
    const otpCaches = await prisma.otp_cache.findMany({
      where: {
        generated_email_id: { in: emails.map((e) => e.id) },
      },
      select: { generated_email_id: true, latest_otp: true },
    });

    const otpMap = new Map(
      otpCaches.map((o) => [o.generated_email_id, o.latest_otp])
    );

    return NextResponse.json({
      ok: true,
      data: emails.map((e) => ({
        id: e.id,
        generated_email: e.generated_email,
        is_active: e.is_active,
        created_at: e.created_at.toISOString(),
        buyer_username: e.buyer?.username ?? null,
        latest_otp: otpMap.get(e.id) ?? null,
        message_count: e._count.inbox_messages,
      })),
    });
  } catch (err) {
    console.error("[admin/emails GET] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/emails — create new generated email
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = GenerateEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { mode, customEmail, buyerId, password } = parsed.data;

    let emailAddress: string;
    if (mode === "custom" && customEmail) {
      emailAddress = `${customEmail}@sidoak.my.id`;
    } else {
      const random = Math.random().toString(36).substring(2, 8);
      const ts = Date.now().toString(36).slice(-4);
      emailAddress = `${random}-${ts}@sidoak.my.id`;
    }

    const exists = await prisma.generated_emails.findUnique({
      where: { generated_email: emailAddress },
    });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "Email address already exists" },
        { status: 409 }
      );
    }

    if (buyerId) {
      const buyer = await prisma.buyers.findUnique({ where: { id: buyerId } });
      if (!buyer) {
        return NextResponse.json(
          { ok: false, error: "Buyer not found" },
          { status: 404 }
        );
      }
    }

    const password_hash = await hash(password, {
      type: 2,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const created = await prisma.generated_emails.create({
      data: {
        generated_email: emailAddress,
        password_hash,
        buyer_id: buyerId ?? null,
        created_by: session.sub,
        is_active: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: created.id,
          generated_email: created.generated_email,
          is_active: created.is_active,
          created_at: created.created_at.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[admin/emails POST] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
