"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  History,
  Bell,
  LogOut,
  Megaphone,
  MessageCircleMore,
  PlusCircle,
  Search,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { RoleName, type RoleName as RoleValue } from "../modules/cm-work/cm-work-types";

type AppLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  accent?: "danger";
};

export function getAppLinks(role: RoleValue): AppLink[] {
  const baseLinks: AppLink[] = [
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "All Work", href: "/work", icon: Wrench },
    { label: "Members", href: "/members", icon: UsersRound },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Reports", href: "/reports", icon: FileSpreadsheet },
    { label: "Profile", href: "/profile", icon: UserRound },
    { label: "Create Request", href: "/request", icon: PlusCircle },
    { label: "Track Work", href: "/tracking", icon: Search },
  ];

  if (role === RoleName.ADMIN) {
    baseLinks.push(
      { label: "Admin", href: "/admin/users", icon: Settings },
      { label: "System Settings", href: "/admin/settings", icon: SlidersHorizontal },
      { label: "Organization", href: "/admin/organization", icon: Building2 },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "LINE Settings", href: "/admin/line", icon: MessageCircleMore },
      { label: "History", href: "/admin/history", icon: History },
    );
  }

  baseLinks.push({ label: "Logout", href: "/logout", icon: LogOut, accent: "danger" });

  return baseLinks;
}

export function AppNavLinks({
  role,
  onNavigate,
}: {
  role: RoleValue;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const links = getAppLinks(role);

  return (
    <>
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isDanger = item.accent === "danger";
        const className = isDanger
          ? "mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 hover:bg-red-50"
          : active
            ? "flex items-center gap-3 rounded-xl bg-[var(--soft)] px-3 py-3 text-sm font-semibold"
            : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[var(--soft)]";

        return (
          <Link
            key={item.label}
            aria-current={active ? "page" : undefined}
            className={className}
            href={item.href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" size={17} className={isDanger ? "" : "text-[var(--primary)]"} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
