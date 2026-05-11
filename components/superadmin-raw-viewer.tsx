"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { InboxMessageFull } from "@/types";
import { ChevronDown, ChevronUp, Mail, Code } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SuperadminRawMessageViewerProps {
  messages: InboxMessageFull[];
}

export function SuperadminRawMessageViewer({
  messages,
}: SuperadminRawMessageViewerProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Mail className="h-4 w-4 text-primary" />
          Messages ({messages.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/50">No messages yet</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="border border-border/40 rounded-lg overflow-hidden"
          >
            {/* Message header */}
            <div
              className="flex items-center gap-3 p-3 hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() =>
                setExpandedId(expandedId === msg.id ? null : msg.id)
              }
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    From:{" "}
                    <span className="text-foreground/80 font-medium">
                      {msg.sender ?? "Unknown"}
                    </span>
                  </span>
                  {msg.otp_code && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono"
                    >
                      OTP: {msg.otp_code}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground/50 ml-auto tabular-nums">
                    {formatDistanceToNow(new Date(msg.received_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 mt-0.5 truncate">
                  {msg.subject ?? "(no subject)"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {msg.otp_code && (
                  <CopyButton text={msg.otp_code} label="OTP" size="sm" />
                )}
                {expandedId === msg.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expandable raw body */}
            {expandedId === msg.id && (
              <div className="border-t border-border/40 bg-background/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    Raw email body
                  </span>
                  {msg.raw_body && (
                    <CopyButton
                      text={msg.raw_body}
                      label="Copy raw"
                      size="sm"
                      variant="ghost"
                    />
                  )}
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/70 max-h-80 overflow-y-auto bg-background/50 p-3 rounded border border-border/30">
                  {msg.raw_body ?? "(empty body)"}
                </pre>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
