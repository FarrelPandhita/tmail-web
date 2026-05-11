import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { checkLoginRate, resetLoginRate } from "@/lib/rate-limit";
import { LoginSchema } from "@/lib/validations";
import { verify } from "argon2";

export async function POST(req: NextRequest) {
  try {
    // ── Rate limiting ───────────────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const rate = checkLoginRate(ip);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many login attempts. Please wait 15 minutes.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rate.resetAt - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // ── Input validation ────────────────────────────────────────────────────
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: parsed.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // ── Try buyer login (via generated_emails) ──────────────────────────────
    const generatedEmail = await prisma.generated_emails.findUnique({
      where: { generated_email: email },
      include: {
        buyer: true,
      },
    });

    if (generatedEmail && generatedEmail.is_active) {
      const valid = await verify(generatedEmail.password_hash, password);
      if (valid) {
        resetLoginRate(ip);
        await setSessionCookie({
          sub: generatedEmail.id,
          role: "buyer",
          email: generatedEmail.generated_email,
        });
        return NextResponse.json({ ok: true, role: "buyer" });
      }
    }

    // ── Try admin login (via admins table) ──────────────────────────────────
    const admin = await prisma.admins.findUnique({
      where: { email },
    });

    if (admin) {
      const valid = await verify(admin.password_hash, password);
      if (valid) {
        resetLoginRate(ip);
        const role =
          admin.is_superadmin || admin.role === "superadmin"
            ? "superadmin"
            : "generator_admin";

        await setSessionCookie({
          sub: admin.id,
          role,
          email: admin.email,
        });

        return NextResponse.json({ ok: true, role });
      }
    }

    // ── Auth failed ──────────────────────────────────────────────────────────
    // Don't reveal which part failed (email or password)
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      },
      { status: 401 }
    );
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
