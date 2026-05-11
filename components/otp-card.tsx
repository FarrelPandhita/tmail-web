"use client";

import { useOtpPoll } from "@/hooks/use-otp-poll";
import { CopyButton } from "@/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface OtpCardProps {
  emailAddress?: string;
}

export function OtpCard({ emailAddress }: OtpCardProps) {
  const { data, isLoading, isError, dataUpdatedAt } = useOtpPoll();

  const otp = data?.latest_otp;
  const isAlphanumeric = otp ? /[a-zA-Z]/.test(otp) : false;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Glow accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Latest OTP
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            {!isLoading && (
              <RefreshCw className="h-3 w-3 text-muted-foreground/40" />
            )}
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                {lastUpdated}
              </span>
            )}
          </div>
        </div>
        {emailAddress && (
          <p className="text-xs text-muted-foreground/60 font-mono truncate">
            {emailAddress}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isError && (
          <div className="text-sm text-destructive/80 bg-destructive/10 px-3 py-2 rounded-md">
            Failed to load OTP. Retrying...
          </div>
        )}

        {!isError && (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex-1 font-mono text-4xl font-bold tracking-[0.25em] select-all",
                "transition-all duration-300",
                otp ? "text-foreground" : "text-muted-foreground/30"
              )}
            >
              {isLoading && !otp ? (
                <span className="text-2xl animate-pulse">Loading...</span>
              ) : otp ? (
                otp
              ) : (
                <span className="text-xl">—</span>
              )}
            </div>
            <Badge
              variant="outline"
              className="text-[10px] hidden sm:inline-flex"
            >
              {isAlphanumeric ? "Alphanumeric" : "Numeric"}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2">
          <CopyButton
            text={otp}
            label="Copy OTP"
            variant="default"
            size="default"
            className="flex-1 sm:flex-none"
          />
          {data?.source && (
            <span className="text-[10px] text-muted-foreground/50 hidden sm:block">
              via {data.source}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
