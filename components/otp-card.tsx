"use client";

import { useOtpPoll } from "@/hooks/use-otp-poll";
import { CopyButton } from "@/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Wifi } from "lucide-react";

interface OtpCardProps {
  emailAddress?: string;
}

export function OtpCard({ emailAddress }: OtpCardProps) {
  const { data, isLoading, isError, dataUpdatedAt } = useOtpPoll();

  const otp = data?.latest_otp;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  // Split OTP into individual digit boxes if it's 4-8 chars
  const digits = otp && otp.length >= 4 && otp.length <= 8 ? otp.split("") : null;

  return (
    <Card
      className="relative overflow-hidden border"
      style={{
        background: "oklch(0.17 0.025 264 / 80%)",
        borderColor: "oklch(0.63 0.20 264 / 20%)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 0 40px oklch(0.63 0.20 264 / 8%)",
      }}
    >
      {/* Gradient top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, oklch(0.63 0.20 264), oklch(0.65 0.18 290), transparent)",
        }}
      />

      {/* Soft glow inside */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.63 0.20 264 / 8%) 0%, transparent 100%)",
        }}
      />

      <CardHeader className="pb-3 pt-6 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "oklch(0.63 0.20 264)" }} />
            OTP Terbaru
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
            ) : (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "oklch(0.75 0.18 145)" }}
                />
                <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                  {lastUpdated ?? "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pb-6 relative">
        {isError && (
          <div
            className="text-sm px-3 py-2 rounded-xl"
            style={{
              color: "oklch(0.65 0.20 22)",
              background: "oklch(0.65 0.20 22 / 10%)",
              border: "1px solid oklch(0.65 0.20 22 / 20%)",
            }}
          >
            Gagal memuat OTP. Mencoba ulang...
          </div>
        )}

        {!isError && (
          <>
            {/* Digit boxes if short OTP, else plain text */}
            {digits ? (
              <div className="flex items-center gap-2 flex-wrap py-2">
                {digits.map((d, i) => (
                  <div
                    key={i}
                    className="flex h-14 w-12 items-center justify-center rounded-xl text-2xl font-bold font-mono transition-all duration-300"
                    style={{
                      background: otp
                        ? "oklch(0.22 0.04 264)"
                        : "oklch(0.19 0.02 264)",
                      border: otp
                        ? "1px solid oklch(0.63 0.20 264 / 30%)"
                        : "1px solid oklch(1 0 0 / 6%)",
                      color: otp ? "oklch(0.88 0.06 264)" : "oklch(0.35 0.02 264)",
                      boxShadow: otp ? "0 2px 12px oklch(0.63 0.20 264 / 15%)" : "none",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="py-3 font-mono text-4xl font-bold tracking-[0.2em] select-all transition-all duration-300"
                style={{
                  color: otp ? "oklch(0.88 0.06 264)" : "oklch(0.30 0.02 264)",
                }}
              >
                {isLoading && !otp ? (
                  <span className="text-xl animate-pulse text-muted-foreground/30">
                    Memuat...
                  </span>
                ) : otp ? (
                  otp
                ) : (
                  <span className="text-2xl text-muted-foreground/20">Belum ada OTP</span>
                )}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-3">
              <CopyButton
                text={otp}
                label="Salin OTP"
                variant="default"
                size="default"
                className="flex-1 sm:flex-none font-semibold"
              />
              {data?.source && (
                <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  {data.source}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
