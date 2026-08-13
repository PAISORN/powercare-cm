"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UnreadBadge } from "./unread-badge";
import { Menu, X } from "lucide-react";
import { AppNavLinks } from "./app-nav-links";
import { AppBrand } from "./app-brand";
import { UserAvatar } from "./user-avatar";
import type { RoleName } from "../modules/cm-work/cm-work-types";
import type { RolePermissionOverrideRecord, SiteAdminPermissionRecord, UserPermissionOverrideRecord } from "../modules/auth/site-admin-permissions";
import { formatRoleName } from "../modules/users/role-labels";

export function MobileAppDrawer({
  userName,
  role,
  categoryName,
  userId,
  organizationId,
  plantId,
  plantCode,
  siteAdminPermissions,
  rolePermissionOverrides,
  userPermissionOverrides,
  hasPhoto = false,
  version,
  unreadCount,
}: {
  userName: string;
  role: RoleName;
  categoryName?: string | null;
  userId?: string;
  organizationId?: string | null;
  plantId?: string | null;
  plantCode?: string | null;
  siteAdminPermissions?: SiteAdminPermissionRecord[];
  rolePermissionOverrides?: RolePermissionOverrideRecord[];
  userPermissionOverrides?: UserPermissionOverrideRecord[];
  hasPhoto?: boolean;
  version?: number;
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      buttonRef.current?.focus();
    }
  }, [open]);

  const drawer = open ? (
    <div className="fixed inset-0 z-50 md:hidden" data-body-scroll-lock="true">
      <button
        aria-label="Close menu overlay"
        className="absolute inset-0 bg-slate-950/50"
        data-testid="drawer-overlay"
        type="button"
        onClick={() => setOpen(false)}
      />
      <div
        aria-label="Application menu"
        className="guardian-sidebar fixed inset-0 flex w-screen max-w-none flex-col p-5 shadow-[var(--shadow-raised)] sm:absolute sm:inset-y-0 sm:left-0 sm:right-auto sm:w-[86vw] sm:max-w-[340px] sm:border-r sm:border-[var(--line)]"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <strong className="text-lg font-extrabold text-[var(--primary)]"><AppBrand /></strong>
          <button
            aria-label="Close menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)]"
            type="button"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-3">
          <UserAvatar fullName={userName} hasPhoto={hasPhoto} size="md" userId={userId} version={version} />
          <div className="min-w-0">
            <p className="truncate font-bold">{userName}</p>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {formatRoleName(role)}
              {categoryName ? ` - ${categoryName}` : ""}
            </p>
          </div>
        </div>

        <nav
          className="mt-6 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1"
          data-testid="mobile-drawer-nav"
        >
          <AppNavLinks
            role={role}
            permissionContext={{ id: userId, organizationId, plantCode, plantId, rolePermissionOverrides, siteAdminPermissions, userPermissionOverrides }}
            onNavigate={() => setOpen(false)}
          />
        </nav>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        aria-label="Open menu"
        className="relative grid size-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] shadow-sm transition hover:bg-[var(--soft)] md:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
        <UnreadBadge count={unreadCount} position="cardEdge" />
      </button>

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
