"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppNavLinks } from "./app-nav-links";
import { AppBrand } from "./app-brand";
import { UserAvatar } from "./user-avatar";
import type { RoleName } from "../modules/cm-work/cm-work-types";

export function MobileAppDrawer({
  userName,
  role,
  categoryName,
  userId,
  hasPhoto = false,
  version,
  unreadCount,
}: {
  userName: string;
  role: RoleName;
  categoryName?: string | null;
  userId?: string;
  hasPhoto?: boolean;
  version?: number;
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

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

  return (
    <>
      <button
        ref={buttonRef}
        aria-label="Open menu"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] shadow-sm transition hover:bg-[var(--soft)] sm:h-10 sm:w-10 md:hidden"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-slate-950/50"
            data-testid="drawer-overlay"
            type="button"
            onClick={() => setOpen(false)}
          />
          <div
            aria-label="Application menu"
            className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl"
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
                  {role}
                  {categoryName ? ` - ${categoryName}` : ""}
                </p>
              </div>
            </div>

            <nav
              className="mt-6 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1"
              data-testid="mobile-drawer-nav"
            >
              <AppNavLinks role={role} onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
