"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  FileSpreadsheet,
  Factory,
  History,
  Bell,
  LogOut,
  Megaphone,
  MessageSquareText,
  MessageCircleMore,
  PlusCircle,
  Search,
  Settings,
  SlidersHorizontal,
  Tags,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { RoleName, type RoleName as RoleValue } from "../modules/cm-work/cm-work-types";

type AppLink = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  accent?: "danger";
  kind?: "link" | "section";
  nested?: boolean;
  sectionId?: string;
  parentSectionId?: string;
};

export function getAppLinks(role: RoleValue): AppLink[] {
  const baseLinks: AppLink[] = [
    { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { label: "All Work", href: "/work", icon: Wrench },
    { label: "Members", href: "/members", icon: UsersRound },
  ];

  if (role !== RoleName.VISITOR) {
    baseLinks.push(
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Reports", kind: "section", icon: FileSpreadsheet, sectionId: "reports" },
      { label: "Daily Report", href: "/reports/daily", icon: CalendarDays, nested: true, parentSectionId: "reports" },
      { label: "CM Reports", href: "/reports/cm", icon: FileSpreadsheet, nested: true, parentSectionId: "reports" },
      { label: "Create Request", href: "/request", icon: PlusCircle },
      { label: "Track Work", href: "/tracking", icon: Search },
    );
  }

  baseLinks.push({ label: "Profile", href: "/profile", icon: UserRound });

  if (role === RoleName.ADMIN) {
    baseLinks.push(
      { label: "Admin Users", href: "/admin/users", icon: Settings },
      { label: "Admin Settings", kind: "section", icon: Settings, sectionId: "admin-settings" },
      { label: "System Settings", href: "/admin/settings", icon: SlidersHorizontal, nested: true, parentSectionId: "admin-settings" },
      { label: "Organization", href: "/admin/organization", icon: Building2, nested: true, parentSectionId: "admin-settings" },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone, nested: true, parentSectionId: "admin-settings" },
      { label: "Feedback", href: "/admin/feedback", icon: MessageSquareText, nested: true, parentSectionId: "admin-settings" },
      { label: "LINE Settings", href: "/admin/line", icon: MessageCircleMore, nested: true, parentSectionId: "admin-settings" },
      { label: "Category", href: "/admin/categories", icon: Tags, nested: true, parentSectionId: "admin-settings" },
      { label: "Zone", href: "/admin/zones", icon: Factory, nested: true, parentSectionId: "admin-settings" },
      { label: "QR Code", href: "/admin/qr-code", icon: Search, nested: true, parentSectionId: "admin-settings" },
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    links.reduce<Record<string, boolean>>((sections, link) => {
      if (link.parentSectionId && link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`))) {
        sections[link.parentSectionId] = true;
      }
      return sections;
    }, {}),
  );

  return (
    <>
      {links.map((item) => {
        if (item.kind === "section") {
          const Icon = item.icon;
          const sectionId = item.sectionId ?? item.label;
          const sectionOpen = openSections[sectionId] ?? false;
          const sectionActive = links.some((link) => link.parentSectionId === sectionId && link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`)));
          return (
            <button
              key={item.label}
              aria-expanded={sectionOpen}
              className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-[var(--soft)] ${
                sectionOpen || sectionActive
                  ? "bg-[var(--soft)] text-[var(--ink)]"
                  : "text-[var(--ink)]"
              }`}
              type="button"
              onClick={() => setOpenSections((current) => ({ ...current, [sectionId]: !sectionOpen }))}
            >
              <ChevronRight
                aria-hidden="true"
                className={`shrink-0 text-[var(--primary)] transition-transform duration-200 ${
                  sectionOpen ? "rotate-90" : ""
                }`}
                size={17}
              />
              {Icon ? <Icon aria-hidden="true" size={17} className="shrink-0 text-[var(--primary)]" /> : null}
              <span>{item.label}</span>
            </button>
          );
        }

        if (item.nested && !(openSections[item.parentSectionId ?? ""] ?? false)) return null;

        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isDanger = item.accent === "danger";
        const className = isDanger
          ? "mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 hover:bg-red-50"
          : active
            ? `flex items-center gap-3 rounded-xl bg-[var(--soft)] px-3 py-3 text-sm font-semibold ${item.nested ? "ml-3" : ""}`
            : `flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[var(--soft)] ${item.nested ? "ml-3" : ""}`;

        return (
          <Link
            key={item.label}
            aria-current={active ? "page" : undefined}
            className={className}
            href={item.href ?? "#"}
            onClick={onNavigate}
          >
            {Icon ? <Icon aria-hidden="true" size={17} className={isDanger ? "" : "text-[var(--primary)]"} /> : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
