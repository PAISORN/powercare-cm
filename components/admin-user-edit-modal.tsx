"use client";

import { Edit3, X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveListPosition } from "./preserve-list-position";

type AdminUserEditModalProps = {
  children: ReactNode;
  fullName: string;
  storageKey: string;
  targetId: string;
  username: string;
};

export function AdminUserEditModal({ children, fullName, storageKey, targetId, username }: AdminUserEditModalProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);
  const rememberPosition = (event: FormEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    saveListPosition(storageKey, targetId);
  };

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Edit3 aria-hidden="true" size={16} />
        ดูรายละเอียด / แก้ไข
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-slate-950/35 p-3 backdrop-blur-md sm:p-6"
              data-admin-user-edit-backdrop
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <section
                aria-labelledby={titleId}
                aria-modal="true"
                className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-[var(--surface)] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
                role="dialog"
              >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Admin User</p>
                    <h2 className="mt-1 truncate text-xl font-extrabold sm:text-2xl" id={titleId}>แก้ไขผู้ใช้ {fullName}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Username: {username}</p>
                  </div>
                  <button
                    aria-label="ปิดหน้าต่างแก้ไขผู้ใช้"
                    className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    onClick={close}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <X aria-hidden="true" size={19} />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6" onSubmitCapture={rememberPosition}>
                  {children}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}