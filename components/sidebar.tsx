"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Shield,
  Activity,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SidebarProps {
  role: "buyer" | "generator_admin" | "superadmin";
  email: string;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const navByRole: Record<string, NavItem[]> = {
  buyer: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ],
  generator_admin: [
    { label: "Dashboard", href: "/generator", icon: LayoutDashboard },
    { label: "Email Manager", href: "/generator", icon: Mail },
  ],
  superadmin: [
    { label: "Overview", href: "/superadmin", icon: LayoutDashboard },
    { label: "Global Inbox", href: "/superadmin/inbox", icon: Inbox },
    { label: "Email Manager", href: "/generator", icon: Mail },
    { label: "Search", href: "/superadmin/search", icon: Search },
    { label: "Audit Logs", href: "/superadmin/audit", icon: Activity },
  ],
};

const roleLabels: Record<string, { label: string; color: string }> = {
  buyer: { label: "Buyer", color: "oklch(0.65 0.18 200)" },
  generator_admin: { label: "Generator", color: "oklch(0.70 0.18 50)" },
  superadmin: { label: "Superadmin", color: "oklch(0.63 0.20 264)" },
};

export function Sidebar({ role, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = navByRole[role] ?? [];
  const roleInfo = roleLabels[role];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="flex flex-col w-64 shrink-0 min-h-screen border-r"
      style={{
        background: "oklch(0.15 0.025 264)",
        borderColor: "oklch(1 0 0 / 7%)",
      }}
    >
      {/* Brand */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "oklch(1 0 0 / 7%)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.63 0.20 264), oklch(0.55 0.22 285))",
              boxShadow: "0 4px 16px oklch(0.63 0.20 264 / 40%)",
            }}
          >
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base tracking-tight leading-none">TMail</p>
            <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.55 0.04 264)" }}>
              OTP Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p
          className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] mb-2"
          style={{ color: "oklch(0.45 0.03 264)" }}
        >
          Menu
        </p>

        {navItems.map((item) => {
          const isActive =
            item.href === pathname ||
            (item.href !== "/superadmin" && item.href !== "/dashboard" && item.href !== "/generator" && item.href !== "/" && pathname.startsWith(item.href + "/"));

          return (
            <Link key={item.href + item.label} href={item.href}>
              <div
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, oklch(0.63 0.20 264 / 20%), oklch(0.55 0.22 285 / 15%))",
                        boxShadow: "inset 0 0 0 1px oklch(0.63 0.20 264 / 25%)",
                        color: "oklch(0.85 0.08 264)",
                      }
                    : { background: "transparent" }
                }
              >
                <item.icon
                  className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
                  style={isActive ? { color: "oklch(0.75 0.15 264)" } : {}}
                />
                {item.label}
                {isActive && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: "oklch(0.63 0.20 264)" }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: "oklch(1 0 0 / 7%)" }}>
        {/* User badge */}
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
          style={{ background: "oklch(0.18 0.025 264)" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 text-xs font-bold"
            style={{
              background: `oklch(0.22 0.04 264)`,
              color: roleInfo.color,
            }}
          >
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{email}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: roleInfo.color }}>
              {roleInfo.label}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-muted-foreground hover:text-destructive group"
          style={{ background: "transparent" }}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
