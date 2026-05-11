import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuperadminSearchBar } from "@/components/superadmin-search-bar";
import { SuperadminInboxTable } from "@/components/superadmin-inbox-table";
import { Search } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

export const metadata: Metadata = { title: "Search" };

export default async function SuperadminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let emailResults: {
    id: number;
    generated_email: string;
    is_active: boolean | null;
    created_at: string;
    buyer_username: string | null;
    latest_otp: string | null;
    message_count: number;
  }[] = [];

  let messageResults: {
    id: number;
    inbox_email: string;
    sender: string | null;
    subject: string | null;
    otp_code: string | null;
    received_at: string;
  }[] = [];

  if (query) {
    const [emails, messages, otpCaches] = await Promise.all([
      prisma.generated_emails.findMany({
        where: { generated_email: { contains: query, mode: "insensitive" } },
        take: 20,
        include: {
          buyer: { select: { username: true } },
          _count: { select: { inbox_messages: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.inbox_messages.findMany({
        where: {
          OR: [
            { sender: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { otp_code: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
        include: { generated_email: { select: { generated_email: true } } },
        orderBy: { received_at: "desc" },
      }),
      prisma.otp_cache.findMany({
        select: { generated_email_id: true, latest_otp: true },
      }),
    ]);

    const otpMap = new Map(otpCaches.map((o) => [o.generated_email_id, o.latest_otp]));

    emailResults = emails.map((e) => ({
      id: e.id,
      generated_email: e.generated_email,
      is_active: e.is_active,
      created_at: e.created_at ? e.created_at.toISOString() : new Date().toISOString(),
      buyer_username: e.buyer?.username ?? null,
      latest_otp: otpMap.get(e.id) ?? null,
      message_count: e._count.inbox_messages,
    }));

    messageResults = messages.map((m) => ({
      id: m.id,
      inbox_email: m.generated_email.generated_email,
      sender: m.sender,
      subject: m.subject,
      otp_code: m.otp_code,
      received_at: m.received_at ? m.received_at.toISOString() : new Date().toISOString(),
    }));
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Search
        </h1>
        {query && (
          <p className="text-sm text-muted-foreground mt-1">
            Results for: <span className="text-foreground font-medium">"{query}"</span>
          </p>
        )}
      </div>

      <SuperadminSearchBar />

      {query && (
        <>
          {emailResults.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Email Addresses ({emailResults.length})
              </h2>
              <SuperadminInboxTable emails={emailResults} />
            </div>
          )}

          {messageResults.length > 0 && (
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Messages ({messageResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {messageResults.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] text-muted-foreground/70">{msg.inbox_email}</code>
                        {msg.otp_code && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            OTP: {msg.otp_code}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">From: {msg.sender ?? "Unknown"}</p>
                      <p className="text-sm mt-0.5 truncate">{msg.subject ?? "(no subject)"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {msg.otp_code && <CopyButton text={msg.otp_code} label="OTP" size="sm" />}
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                        {new Date(msg.received_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {emailResults.length === 0 && messageResults.length === 0 && (
            <div className="text-center py-16">
              <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
