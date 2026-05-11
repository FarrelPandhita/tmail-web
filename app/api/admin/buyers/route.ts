import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/admin/buyers — list all buyers
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const buyers = await prisma.buyers.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { generated_emails: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      data: buyers.map((b) => ({
        id: b.id,
        username: b.username,
        is_active: b.is_active,
        created_at: b.created_at ? b.created_at.toISOString() : new Date().toISOString(),
        email_count: b._count.generated_emails,
      })),
    });
  } catch (err) {
    console.error("[admin/buyers GET] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/buyers — create a buyer
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const username = (body.username as string)?.trim();

    if (!username || username.length < 2 || username.length > 64) {
      return NextResponse.json(
        { ok: false, error: "Username must be 2-64 characters" },
        { status: 400 }
      );
    }

    const exists = await prisma.buyers.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "Username already exists" },
        { status: 409 }
      );
    }

    const buyer = await prisma.buyers.create({
      data: { username, is_active: true },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: buyer.id,
          username: buyer.username,
          is_active: buyer.is_active,
          created_at: buyer.created_at ? buyer.created_at.toISOString() : new Date().toISOString(),
          email_count: 0,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[admin/buyers POST] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
