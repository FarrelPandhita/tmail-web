import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OtpCard } from "@/components/otp-card";
import { MessageList } from "@/components/message-list";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Mail, CheckCircle2, XCircle, Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default async function BuyerDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "buyer") redirect("/login");

  const emailAccount = await prisma.generated_emails.findFirst({
    where: { id: Number(session.sub) },
    select: {
      generated_email: true,
      is_active: true,
      created_at: true,
      buyer: { select: { username: true } },
    },
  });

  if (!emailAccount) redirect("/login");

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "oklch(0.63 0.20 264)" }} />
            Dashboard Saya
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Monitor inbox dan salin OTP secara instan.
          </p>
        </div>
        {emailAccount.buyer?.username && (
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-medium"
            style={{
              background: "oklch(0.63 0.20 264 / 12%)",
              color: "oklch(0.75 0.15 264)",
              border: "1px solid oklch(0.63 0.20 264 / 20%)",
            }}
          >
            👤 {emailAccount.buyer.username}
          </div>
        )}
      </div>

      {/* Email Address Card */}
      <Card
        className="border"
        style={{
          background: "oklch(0.17 0.025 264 / 80%)",
          borderColor: "oklch(1 0 0 / 8%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Mail className="h-3.5 w-3.5" style={{ color: "oklch(0.63 0.20 264)" }} />
            Alamat Email Kamu
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <code
              className="text-base font-mono font-semibold"
              style={{ color: "oklch(0.90 0.02 264)" }}
            >
              {emailAccount.generated_email}
            </code>
            <CopyButton text={emailAccount.generated_email} label="Salin" />
            {emailAccount.is_active ? (
              <Badge
                variant="outline"
                className="text-[11px] font-medium"
                style={{
                  color: "oklch(0.75 0.18 145)",
                  borderColor: "oklch(0.75 0.18 145 / 30%)",
                  background: "oklch(0.75 0.18 145 / 10%)",
                }}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Aktif
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[11px] font-medium"
                style={{
                  color: "oklch(0.65 0.20 22)",
                  borderColor: "oklch(0.65 0.20 22 / 30%)",
                  background: "oklch(0.65 0.20 22 / 10%)",
                }}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Nonaktif
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main grid — OTP + Messages */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OtpCard emailAddress={emailAccount.generated_email} />
        <MessageList />
      </div>

      <p className="text-xs text-muted-foreground/30 pb-2">
        OTP dan pesan diperbarui otomatis setiap 5 detik.
      </p>
    </div>
  );
}
