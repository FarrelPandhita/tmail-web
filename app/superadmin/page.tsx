import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuperadminInboxTable } from "@/components/superadmin-inbox-table";
import { SuperadminSearchBar } from "@/components/superadmin-search-bar";
import {
  Mail,
  Users,
  CheckCircle2,
  MessageSquare,
  Activity,
  Shield,
} from "lucide-react";

export const metadata: Metadata = { title: "Superadmin Overview" };

export default async function SuperadminPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalEmails,
    activeEmails,
    totalBuyers,
    messagesToday,
    totalAdmins,
    recentAuditLogs,
    recentEmails,
    otpCaches,
  ] = await Promise.all([
    prisma.generated_emails.count(),
    prisma.generated_emails.count({ where: { is_active: true } }),
    prisma.buyers.count({ where: { is_active: true } }),
    prisma.inbox_messages.count({ where: { received_at: { gte: today } } }),
    prisma.admins.count(),
    prisma.audit_logs.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: { admin: { select: { email: true } } },
    }),
    prisma.generated_emails.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      include: {
        buyer: { select: { username: true } },
        _count: { select: { inbox_messages: true } },
      },
    }),
    prisma.otp_cache.findMany({
      select: { generated_email_id: true, latest_otp: true, updated_at: true },
    }),
  ]);

  const otpMap = new Map(otpCaches.map((o) => [o.generated_email_id, o]));

  const stats = [
    { label: "Total Emails", value: totalEmails, icon: Mail, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Active Emails", value: activeEmails, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Active Buyers", value: totalBuyers, icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Messages Today", value: messagesToday, icon: MessageSquare, color: "text-orange-400", bg: "bg-orange-400/10" },
    { label: "Admin Accounts", value: totalAdmins, icon: Shield, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Superadmin Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full visibility over all inboxes, buyers, and system activity.
          </p>
        </div>
        <Badge variant="outline" className="text-primary border-primary/30">
          SUPERADMIN
        </Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <div className={`p-1 rounded ${stat.bg}`}>
                  <stat.icon className={`h-3 w-3 ${stat.color}`} />
                </div>
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SuperadminSearchBar />

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Recent Admin Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAuditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground/50 py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-2">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground/60 font-mono text-xs shrink-0">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span className="text-primary/80 text-xs font-medium shrink-0">{log.action}</span>
                  <span className="text-muted-foreground/70 text-xs truncate">{log.admin.email}</span>
                  {log.target_email && (
                    <span className="text-foreground/60 font-mono text-xs truncate ml-auto">
                      → {log.target_email}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SuperadminInboxTable
        emails={recentEmails.map((e) => {
          const otp = otpMap.get(e.id);
          return {
            id: e.id,
            generated_email: e.generated_email,
            is_active: e.is_active,
            created_at: e.created_at.toISOString(),
            buyer_username: e.buyer?.username ?? null,
            latest_otp: otp?.latest_otp ?? null,
            message_count: e._count.inbox_messages,
          };
        })}
      />
    </div>
  );
}
