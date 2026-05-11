import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { ResetPasswordSchema } from "@/lib/validations";
import { hash } from "argon2";

// PATCH /api/admin/emails/[id] — toggle active or reset password
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const body = await req.json();
    const action = body.action as string;

    if (action === "toggle") {
      const email = await prisma.generated_emails.findUnique({ where: { id } });
      if (!email) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }

      const updated = await prisma.generated_emails.update({
        where: { id },
        data: { is_active: !email.is_active },
      });

      await prisma.audit_logs.create({
        data: {
          admin_id: Number(session.sub),
          action: updated.is_active ? "ENABLE_EMAIL" : "DISABLE_EMAIL",
          target_email: email.generated_email,
        },
      });

      return NextResponse.json({
        ok: true,
        data: { id: updated.id, is_active: updated.is_active },
      });
    }

    if (action === "reset_password") {
      const parsed = ResetPasswordSchema.safeParse({ emailId: idStr, ...body });
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const password_hash = await hash(parsed.data.newPassword, {
        type: 2,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      const email = await prisma.generated_emails.findUnique({ where: { id }, select: { generated_email: true } });
      await prisma.generated_emails.update({
        where: { id },
        data: { password_hash },
      });

      if (email) {
        await prisma.audit_logs.create({
          data: {
            admin_id: Number(session.sub),
            action: "RESET_PASSWORD",
            target_email: email.generated_email,
          },
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "assign_buyer") {
      const buyerId = body.buyerId ? parseInt(body.buyerId, 10) : null;
      await prisma.generated_emails.update({
        where: { id },
        data: { buyer_id: buyerId },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/emails/[id] PATCH] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/admin/emails/[id]/messages — inbox messages for an email (admin view)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const messages = await prisma.inbox_messages.findMany({
      where: { generated_email_id: id },
      orderBy: { received_at: "desc" },
      take: 5,
    });

    return NextResponse.json({
      ok: true,
      data: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        subject: m.subject,
        otp_code: m.otp_code,
        received_at: m.received_at ? m.received_at.toISOString() : new Date().toISOString(),
        has_body: !!m.raw_body,
      })),
    });
  } catch (err) {
    console.error("[admin/emails/[id] GET] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/emails/[id] — delete generated email (Superadmin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    // Ensure only superadmin can delete emails
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    const email = await prisma.generated_emails.findUnique({ where: { id } });
    if (!email) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Delete in transaction to handle relations since we don't have Cascade delete set up
    await prisma.$transaction([
      prisma.inbox_messages.deleteMany({ where: { generated_email_id: id } }),
      prisma.otp_cache.deleteMany({ where: { generated_email_id: id } }),
      prisma.generated_emails.delete({ where: { id } }),
      prisma.audit_logs.create({
        data: {
          admin_id: Number(session.sub),
          action: "DELETE_EMAIL",
          target_email: email.generated_email,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/emails/[id] DELETE] error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
