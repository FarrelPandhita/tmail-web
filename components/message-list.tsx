"use client";

import { useMessages } from "@/hooks/use-messages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { stripHtml } from "@/lib/utils";

export function MessageList() {
  const { data, isLoading, isError } = useMessages();
  const messages = data?.messages ?? [];
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Inbox className="h-4 w-4 text-primary" />
            Recent Messages
          </CardTitle>
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <CardDescription className="text-xs">
          Latest 3 messages in your inbox
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {isError && (
          <p className="text-sm text-destructive/80 py-2">
            Failed to load messages.
          </p>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/50">
              No messages yet
            </p>
          </div>
        )}

        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className="group flex flex-col p-3 rounded-lg border border-border/40 hover:border-border/70 hover:bg-muted/30 transition-all duration-150 cursor-pointer"
            onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
          >
            <div className="flex items-start gap-3 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {msg.sender ?? "Unknown sender"}
                    </p>
                    {msg.otp_code && (
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] shrink-0 font-mono"
                        >
                          OTP: {msg.otp_code}
                        </Badge>
                        <CopyButton text={msg.otp_code} size="icon" className="h-5 w-5 [&_svg]:h-3 [&_svg]:w-3" />
                      </div>
                    )}
                  </div>
                  {expandedId === msg.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm truncate text-foreground/80">
                  {msg.subject ?? "(no subject)"}
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1 tabular-nums">
                  {formatDistanceToNow(new Date(msg.received_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
            {expandedId === msg.id && (
              <div className="mt-3 pt-3 border-t border-border/30">
                {msg.raw_body ? (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {stripHtml(msg.raw_body)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic">No content.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
