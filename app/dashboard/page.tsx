import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OtpCard } from "@/components/otp-card";
import { MessageList } from "@/components/message-list";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Mail, CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function BuyerDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "buyer") redirect("/login");

  // Fetch email account info (SSR)
  const emailAccount = await prisma.generated_emails.findFirst({
    where: { id: session.sub },
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your inbox and copy OTPs instantly.
        </p>
      </div>

      {/* Email Address Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            Your Email Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="text-base font-mono font-semibold text-foreground">
              {emailAccount.generated_email}
            </code>
            <CopyButton text={emailAccount.generated_email} label="Copy" />
            {emailAccount.is_active ? (
              <Badge
                variant="outline"
                className="text-green-400 border-green-400/30 bg-green-400/10"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-red-400 border-red-400/30 bg-red-400/10"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
          {emailAccount.buyer?.username && (
            <p className="text-xs text-muted-foreground/50 mt-2">
              Account: {emailAccount.buyer.username}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* OTP Card — prominent, polling every 5s */}
        <div className="md:col-span-2 lg:col-span-1">
          <OtpCard emailAddress={emailAccount.generated_email} />
        </div>

        {/* Messages — latest 3, polling every 5s */}
        <div className="md:col-span-2 lg:col-span-1">
          <MessageList />
        </div>
      </div>

      {/* Info footer */}
      <p className="text-xs text-muted-foreground/40 pb-6">
        OTP and messages refresh automatically every 5 seconds. •{" "}
        {emailAccount.generated_email}
      </p>
    </div>
  );
}
