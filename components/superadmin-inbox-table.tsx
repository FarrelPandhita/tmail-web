"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { GeneratedEmailSummary } from "@/types";
import { getEmailAgeDetails } from "@/lib/utils";

interface SuperadminInboxTableProps {
  emails: GeneratedEmailSummary[];
}

export function SuperadminInboxTable({ emails }: SuperadminInboxTableProps) {
  const router = useRouter();

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Inbox className="h-4 w-4 text-primary" />
          All Inboxes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="pl-6">Email / Age</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Latest OTP</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Inbox className="h-6 w-6 text-primary/60" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground">No emails found</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      There are no generated emails matching your criteria.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {emails.map((email) => (
              <TableRow
                key={email.id}
                className="border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() =>
                  router.push(`/superadmin/inbox/${email.id}`)
                }
              >
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <code className="text-xs font-mono">
                      {email.generated_email}
                    </code>
                    <CopyButton
                      text={email.generated_email}
                      size="icon"
                      label=""
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(email.created_at).toLocaleDateString()}
                    </span>
                    {(() => {
                      const age = getEmailAgeDetails(email.created_at);
                      return (
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border ${age.color}`}>
                          {age.days}d ({age.status})
                        </Badge>
                      );
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {email.buyer_username ?? (
                    <span className="text-muted-foreground/40 italic text-xs">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {email.latest_otp ? (
                    <code className="text-xs font-mono font-bold text-primary">
                      {email.latest_otp}
                    </code>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums text-sm text-muted-foreground">
                  {email.message_count}
                </TableCell>
                <TableCell>
                  {email.is_active ? (
                    <Badge
                      variant="outline"
                      className="text-green-400 border-green-400/30 bg-green-400/10 text-[11px]"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-red-400 border-red-400/30 bg-red-400/10 text-[11px]"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/superadmin/inbox/${email.id}`);
                    }}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
