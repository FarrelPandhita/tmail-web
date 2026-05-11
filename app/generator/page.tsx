import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GeneratorEmailTable } from "@/components/generator-email-table";
import { Mail, Users, CheckCircle2, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Generator Admin" };

export default async function GeneratorDashboardPage() {
  const session = await getSession();
  if (!session || !["generator_admin", "superadmin"].includes(session.role)) {
    redirect("/login");
  }

  const [totalEmails, activeEmails, totalBuyers, recentEmails, otpCaches] =
    await Promise.all([
      prisma.generated_emails.count(),
      prisma.generated_emails.count({ where: { is_active: true } }),
      prisma.buyers.count(),
      prisma.generated_emails.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        include: {
          buyer: { select: { username: true } },
          _count: { select: { inbox_messages: true } },
        },
      }),
      prisma.otp_cache.findMany({
        select: { generated_email_id: true, latest_otp: true },
      }),
    ]);

  const otpMap = new Map(
    otpCaches.map((o) => [o.generated_email_id, o.latest_otp])
  );

  const stats = [
    { label: "Total Emails", value: totalEmails, icon: Mail, color: "text-blue-400" },
    { label: "Active Emails", value: activeEmails, icon: CheckCircle2, color: "text-green-400" },
    { label: "Total Buyers", value: totalBuyers, icon: Users, color: "text-purple-400" },
    { label: "Inactive", value: totalEmails - activeEmails, icon: Zap, color: "text-orange-400" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Manager</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage generated email addresses, buyer assignments, and lifecycles.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <GeneratorEmailTable
        role={session.role}
        emails={recentEmails.map((e) => ({
          id: e.id,
          generated_email: e.generated_email,
          is_active: e.is_active,
          created_at: e.created_at ? e.created_at.toISOString() : new Date().toISOString(),
          buyer_username: e.buyer?.username ?? null,
          latest_otp: otpMap.get(e.id) ?? null,
          message_count: e._count.inbox_messages,
        }))}
      />
    </div>
  );
}
