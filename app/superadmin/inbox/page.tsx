import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SuperadminInboxTable } from "@/components/superadmin-inbox-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Global Inbox" };

const PAGE_SIZE = 10;

export default async function SuperadminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/login");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [emails, total, otpCaches] = await Promise.all([
    prisma.generated_emails.findMany({
      skip,
      take: PAGE_SIZE,
      orderBy: { created_at: "desc" },
      include: {
        buyer: { select: { username: true } },
        _count: { select: { inbox_messages: true } },
      },
    }),
    prisma.generated_emails.count(),
    prisma.otp_cache.findMany({
      select: { generated_email_id: true, latest_otp: true },
    }),
  ]);

  const otpMap = new Map(otpCaches.map((o) => [o.generated_email_id, o.latest_otp]));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Global Inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} total email{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
        </p>
      </div>

      <SuperadminInboxTable
        emails={emails.map((e) => ({
          id: e.id,
          generated_email: e.generated_email,
          is_active: e.is_active,
          created_at: e.created_at.toISOString(),
          buyer_username: e.buyer?.username ?? null,
          latest_otp: otpMap.get(e.id) ?? null,
          message_count: e._count.inbox_messages,
        }))}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Link href={`/superadmin/inbox?page=${page - 1}`}>
              <Button variant="outline" size="sm" disabled={page <= 1} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
            </Link>
            <Link href={`/superadmin/inbox?page=${page + 1}`}>
              <Button variant="outline" size="sm" disabled={page >= totalPages} className="gap-1">
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
