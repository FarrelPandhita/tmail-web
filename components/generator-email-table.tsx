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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Power,
  KeyRound,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { GeneratedEmailSummary } from "@/types";
import { CopyButton } from "@/components/copy-button";
import { formatDistanceToNow } from "date-fns";

interface GeneratorEmailTableProps {
  emails: GeneratedEmailSummary[];
}

export function GeneratorEmailTable({ emails: initialEmails }: GeneratorEmailTableProps) {
  const router = useRouter();
  const [emails, setEmails] = useState(initialEmails);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create email form state
  const [mode, setMode] = useState<"random" | "custom">("random");
  const [customEmail, setCustomEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  async function handleCreate() {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          customEmail: mode === "custom" ? customEmail : undefined,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Created: ${data.data.generated_email}`);
      setCreateOpen(false);
      setMode("random");
      setCustomEmail("");
      setNewPassword("");
      router.refresh();
    } catch {
      toast.error("Failed to create email");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      const res = await fetch(`/api/admin/emails/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error);
        return;
      }
      setEmails((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, is_active: data.data.is_active } : e
        )
      );
      toast.success(data.data.is_active ? "Email enabled" : "Email disabled");
    } catch {
      toast.error("Failed to toggle email");
    }
  }

  async function handleResetPassword() {
    if (!selectedId || !resetPassword || resetPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/emails/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Password reset successfully");
      setResetOpen(false);
      setResetPassword("");
      setSelectedId(null);
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Mail className="h-4 w-4 text-primary" />
            Generated Emails
          </CardTitle>

          {/* Create email dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Email
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Generated Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <Button
                    variant={mode === "random" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("random")}
                    className="flex-1"
                  >
                    Random
                  </Button>
                  <Button
                    variant={mode === "custom" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("custom")}
                    className="flex-1"
                  >
                    Custom
                  </Button>
                </div>

                {mode === "custom" && (
                  <div className="space-y-1.5">
                    <Label>Custom prefix</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        placeholder="e.g. john"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">
                        @sidoak.my.id
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Password for this email</Label>
                  <Input
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Email
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead className="pl-6">Email</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Latest OTP</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  No emails yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
            {emails.map((email) => (
              <TableRow
                key={email.id}
                className="border-border/30 hover:bg-muted/20 transition-colors"
              >
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono">
                      {email.generated_email}
                    </code>
                    <CopyButton text={email.generated_email} size="icon" label="" />
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
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        Actions
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggle(email.id)}
                      >
                        <Power className="h-3.5 w-3.5 mr-2" />
                        {email.is_active ? "Disable" : "Enable"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedId(email.id);
                          setResetOpen(true);
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
