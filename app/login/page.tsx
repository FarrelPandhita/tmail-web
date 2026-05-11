"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        setAttempts((a) => a + 1);
        setError(data.error ?? "Login failed");
        if (res.status === 429) {
          toast.error("Too many attempts. Please wait 15 minutes.");
        }
        return;
      }

      toast.success("Welcome back!");

      switch (data.role) {
        case "buyer":
          router.push("/dashboard");
          break;
        case "generator_admin":
          router.push("/generator");
          break;
        case "superadmin":
          router.push("/superadmin");
          break;
        default:
          router.push("/login");
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const attemptsLeft = Math.max(0, 5 - attempts);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient blobs */}
      {/* Simple refined background instead of noisy blobs */}
      <div className="absolute inset-0 bg-background pointer-events-none" aria-hidden="true" />
      
      {/* Top subtle highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative w-full max-w-[400px]">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-6 shadow-sm border border-border/50 bg-card">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            TMail
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            OTP Email Dashboard
          </p>
        </div>

        {/* Card */}
        <Card
          className="border shadow-lg"
          style={{
            background: "oklch(0.15 0.02 264)", // Solid clean background instead of glassmorphism
            borderColor: "oklch(1 0 0 / 8%)",
          }}
        >
          <CardHeader className="pb-0 pt-7 px-7">
            <h2 className="text-lg font-semibold">Masuk ke akunmu</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gunakan email yang telah dibuat untukmu
            </p>
          </CardHeader>

          <CardContent className="px-7 pt-6 pb-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Alamat Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@sidoak.my.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="h-11 bg-background/40 border-border/60 focus:border-primary/60 text-sm placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-11 bg-background/40 border-border/60 focus:border-primary/60 pr-11 text-sm placeholder:text-muted-foreground/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3"
                  style={{
                    borderColor: "oklch(0.65 0.20 22 / 30%)",
                    background: "oklch(0.65 0.20 22 / 8%)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.20 22)" }} />
                  <div>
                    <p className="text-sm" style={{ color: "oklch(0.75 0.15 22)" }}>{error}</p>
                    {attempts > 0 && attempts < 5 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {attemptsLeft} percobaan tersisa
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 font-medium text-sm mt-2 transition-colors hover:bg-primary/90"
                disabled={loading || !email || !password}
                style={{
                  background: loading ? undefined : "oklch(0.63 0.20 264)",
                  color: "white",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            <p className="text-[11px] text-muted-foreground/30 text-center mt-6 tracking-wide">
              sidoak.my.id · Secure Infrastructure
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
