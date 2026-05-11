import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { ArrowLeft, Mail, User, CheckCircle2, XCircle, ShieldCheck, HeartPulse } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SuperadminRawMessageViewer } from "@/components/superadmin-raw-viewer";
import { getHealthBadge } from "@/lib/utils";

export const metadata: Metadata = { title: "Inbox Detail" };

export default async function SuperadminInboxDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login");

  const { emailId: emailIdStr } = await params;
  const emailId = parseInt(emailIdStr, 10);

  const [email, otpCache] = await Promise.all([
    prisma.generated_emails.findUnique({
      where: { id: emailId },
      include: {
        buyer: { select: { username: true } },
        inbox_messages: {
          orderBy: { received_at: "desc" },
          take: 10,
        },
        _count: { select: { inbox_messages: true } },
      },
    }),
    prisma.otp_cache.findFirst({
      where: { generated_email_id: emailId },
    }),
  ]);

  if (!email) notFound();

  // Write audit log
  await prisma.audit_logs.create({
    data: {
      admin_id: Number(session.sub),
      action: "VIEW_INBOX",
      target_email: email.generated_email,
      created_at: new Date(),
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <Link href="/superadmin/inbox">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-mono">{email.generated_email}</h1>
            <CopyButton text={email.generated_email} label="Copy" size="sm" />
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {email.is_active ? (
              <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-400 border-red-400/30 bg-red-400/10">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {email._count.inbox_messages} messages total
            </span>
            <span className="text-xs text-muted-foreground">
              Created {email.created_at ? new Date(email.created_at).toLocaleDateString() : "Unknown"}
            </span>
            {(() => {
              const lastMsg = email.inbox_messages[0];
              const health = getHealthBadge(
                email.is_active, 
                email.created_at, 
                lastMsg ? lastMsg.received_at : null
              );
              return (
                <Badge variant="outline" className={`${health.color} text-[10px]`}>
                  <HeartPulse className="h-3 w-3 mr-1" />
                  {health.status}
                </Badge>
              );
            })()}
          </div>
        </div>
        <Badge variant="outline" className="text-amber-400 border-amber-400/30 bg-amber-400/5">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Superadmin View — Audited
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Latest OTP
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <code className="text-2xl font-mono font-bold">
                {otpCache?.latest_otp ?? "—"}
              </code>
              {otpCache?.latest_otp && (
                <CopyButton text={otpCache.latest_otp} label="Copy" size="sm" />
              )}
            </div>
            {otpCache?.updated_at && (
              <p className="text-[10px] text-muted-foreground/50 mt-1">
                {new Date(otpCache.updated_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Assigned Buyer
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold">
              {email.buyer?.username ?? (
                <span className="text-muted-foreground/40 italic text-base font-normal">Unassigned</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" />
              OTP Source
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold">{otpCache?.source ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <SuperadminRawMessageViewer
        messages={email.inbox_messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          recipient: m.recipient,
          subject: m.subject,
          otp_code: m.otp_code,
          raw_body: m.raw_body,
          received_at: m.received_at ? m.received_at.toISOString() : new Date().toISOString(),
          has_body: !!m.raw_body,
        }))}
      />
    </div>
  );
}
