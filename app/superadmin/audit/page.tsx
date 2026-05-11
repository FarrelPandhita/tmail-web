import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Audit Logs" };

const PAGE_SIZE = 20;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [logs, total] = await Promise.all([
    prisma.audit_logs.findMany({
      skip,
      take: PAGE_SIZE,
      orderBy: { created_at: "desc" },
      include: { admin: { select: { email: true, role: true } } },
    }),
    prisma.audit_logs.count(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const actionColors: Record<string, string> = {
    VIEW_INBOX: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    RESET_PASSWORD: "text-orange-400 border-orange-400/30 bg-orange-400/10",
    DISABLE_EMAIL: "text-red-400 border-red-400/30 bg-red-400/10",
    CREATE_EMAIL: "text-green-400 border-green-400/30 bg-green-400/10",
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} total event{total !== 1 ? "s" : ""} · Page {page} of{" "}
          {totalPages}
        </p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No audit events yet.
              </div>
            )}
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 px-6 py-3 hover:bg-muted/10 transition-colors"
              >
                <span className="text-[11px] text-muted-foreground/50 font-mono tabular-nums w-36 shrink-0">
                  {log.created_at ? new Date(log.created_at).toLocaleString() : "Unknown"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${actionColors[log.action] ?? "text-muted-foreground border-border"}`}
                >
                  {log.action}
                </Badge>
                <span className="text-sm text-muted-foreground/70 truncate">
                  {log.admin.email}
                </span>
                {log.target_email && (
                  <span className="text-xs font-mono text-foreground/60 ml-auto truncate">
                    → {log.target_email}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Link href={`/superadmin/audit?page=${page - 1}`}>
              <Button variant="outline" size="sm" disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
            </Link>
            <Link href={`/superadmin/audit?page=${page + 1}`}>
              <Button variant="outline" size="sm" disabled={page >= totalPages}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
