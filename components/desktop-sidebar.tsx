"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppBrand } from "./app-brand";
import { AppNavLinks } from "./app-nav-links";
import { UserAvatar } from "./user-avatar";
import type { RoleName } from "../modules/cm-work/cm-work-types";
import type { SiteAdminPermissionRecord } from "../modules/auth/site-admin-permissions";
import { formatRoleName } from "../modules/users/role-labels";

const SIDEBAR_STORAGE_KEY = "powercare.sidebar.collapsed";

export function DesktopSidebar({
  categoryName,
  fullName,
  hasPhoto,
  plantId,
  role,
  siteAdminPermissions,
  userId,
  version,
}: {
  categoryName?: string | null;
  fullName: string;
  hasPhoto: boolean;
  plantId?: string | null;
  role: RoleName;
  siteAdminPermissions?: SiteAdminPermissionRecord[];
  userId: string;
  version?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    const width = collapsed ? "5rem" : "18rem";
    document.documentElement.style.setProperty("--app-sidebar-width", width);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[var(--surface)] transition-[width,padding] duration-300 md:flex ${
        collapsed ? "w-20 px-3 py-5" : "w-72 p-5"
      }`}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : "justify-between"}`}>
        <Link
          aria-label="PowerCare.CM Dashboard"
          className={`min-w-0 font-extrabold text-[var(--primary)] ${collapsed ? "grid h-11 w-11 place-items-center rounded-2xl bg-[var(--soft)] text-base" : "text-2xl"}`}
          href="/dashboard"
          title="PowerCare.CM"
        >
          {collapsed ? "PC" : <AppBrand />}
        </Link>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-sm transition hover:bg-[var(--soft)]"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight aria-hidden="true" size={18} /> : <ChevronLeft aria-hidden="true" size={18} />}
        </button>
      </div>

      <div
        className={`mt-5 flex items-center rounded-2xl bg-[var(--soft)] transition-all duration-300 ${
          collapsed ? "justify-center p-2" : "gap-3 p-3"
        }`}
        title={collapsed ? `${fullName} - ${formatRoleName(role)}` : undefined}
      >
        <span data-testid="sidebar-user-avatar">
          <UserAvatar fullName={fullName} hasPhoto={hasPhoto} size="md" userId={userId} version={version} />
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate font-bold">{fullName}</p>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {formatRoleName(role)}
              {categoryName ? ` - ${categoryName}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      <nav
        className={`mt-6 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain ${collapsed ? "" : "pr-1"}`}
        data-testid="desktop-sidebar-nav"
      >
        <AppNavLinks
          collapsed={collapsed}
          role={role}
          permissionContext={{
            id: userId,
            plantId,
            siteAdminPermissions,
          }}
        />
      </nav>
    </aside>
  );
}
