"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { LogOut, X } from "lucide-react";
import { logoutAction } from "../app/logout/actions";

export function LogoutMenuItem({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open && mounted) triggerRef.current?.focus();
  }, [mounted, open]);

  const dialog = open ? (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <button
        aria-label="Cancel logout"
        className="absolute inset-0 cursor-default bg-[#07111d]/55 backdrop-blur-md"
        onClick={() => setOpen(false)}
        type="button"
      />
      <section
        aria-labelledby="logout-dialog-title"
        aria-modal="true"
        className="relative z-10 flex aspect-[5/4] w-[min(92vw,400px)] flex-col justify-between rounded-3xl border border-[var(--line)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-raised)] sm:p-7"
        role="dialog"
      >
        <div className="grid grid-cols-[48px_minmax(0,1fr)_44px] items-start gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-red-500/12 text-red-500">
            <LogOut aria-hidden="true" size={24} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-2xl font-extrabold leading-tight" id="logout-dialog-title">ออกจากระบบ?</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              คุณต้องการออกจากระบบ PowerCare ใช่หรือไม่
            </p>
          </div>
          <button
            aria-label="Close logout dialog"
            className="grid size-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            ref={cancelRef}
            className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-bold transition hover:bg-[var(--soft)]"
            onClick={() => setOpen(false)}
            type="button"
          >
            ยกเลิก
          </button>
          <form action={logoutAction} className="w-full">
            <button
              aria-label="Confirm logout"
              className="min-h-12 w-full rounded-xl bg-red-600 px-5 font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              type="submit"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        aria-label="Logout"
        className={`mt-4 flex items-center rounded-xl text-sm font-bold text-red-400 transition hover:bg-red-500/15 hover:text-red-300 ${
          collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"
        }`}
        onClick={() => setOpen(true)}
        title={collapsed ? "Logout" : undefined}
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
        {!collapsed ? <span>Logout</span> : null}
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
