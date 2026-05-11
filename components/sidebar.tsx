"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import {
  LayoutDashboard,
  Inbox,
  Mail,
  Users,
  Activity,
  Search,
  LogOut,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "My Inbox",
    icon: LayoutDashboard,
    roles: ["buyer"],
  },
  {
    href: "/generator",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["generator_admin"],
  },
  {
    href: "/generator/emails",
    label: "Manage Emails",
    icon: Mail,
    roles: ["generator_admin"],
  },
  {
    href: "/generator/buyers",
    label: "Buyers",
    icon: Users,
    roles: ["generator_admin"],
  },
  {
    href: "/superadmin",
    label: "Overview",
    icon: Shield,
    roles: ["superadmin"],
  },
  {
    href: "/superadmin/inbox",
    label: "Global Inbox",
    icon: Inbox,
    roles: ["superadmin"],
  },
  {
    href: "/superadmin/search",
    label: "Search",
    icon: Search,
    roles: ["superadmin"],
  },
  {
    href: "/superadmin/emails",
    label: "All Emails",
    icon: Mail,
    roles: ["superadmin"],
  },
  {
    href: "/superadmin/buyers",
    label: "All Buyers",
    icon: Users,
    roles: ["superadmin"],
  },
  {
    href: "/superadmin/audit",
    label: "Audit Logs",
    icon: Activity,
    roles: ["superadmin"],
  },
];

interface SidebarProps {
  role: UserRole;
  email: string;
}

export function Sidebar({ role, email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  }

  const roleLabel = {
    buyer: "Buyer",
    generator_admin: "Generator Admin",
    superadmin: "Super Admin",
  }[role];

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-card/50 border-r border-border/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">TMail</span>
            <span className="text-xs text-muted-foreground block -mt-0.5">
              sidoak.my.id
            </span>
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* User info */}
      <div className="px-4 py-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground/80 truncate">
            {email}
          </p>
          <span className="text-[10px] text-primary/70 font-medium uppercase tracking-wide">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground/60"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-50" />

      {/* Logout */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
