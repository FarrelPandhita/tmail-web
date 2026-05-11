import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { PaginationSchema } from "@/lib/validations";

// GET /api/superadmin/audit?page=1
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = PaginationSchema.safeParse({
      page: searchParams.get("page") ?? 1,
      limit: 20,
    });

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid pagination" }, { status: 400 });
    }

    const { page } = parsed.data;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          admin: { select: { email: true } },
        },
      }),
      prisma.audit_logs.count(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        logs: logs.map((l) => ({
          id: l.id,
          admin_email: l.admin.email,
          action: l.action,
          target_email: l.target_email,
          created_at: l.created_at ? l.created_at.toISOString() : new Date().toISOString(),
        })),
        pagination: {
          page,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      },
    });
  } catch (err) {
    console.error("[superadmin/audit] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
