"use client";

import { ArrowUpRight, X } from "lucide-react";
import { type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SparePartsMasterModalProps = {
  children: ReactNode;
  eyebrow?: string;
  icon: ReactNode;
  subtitle: string;
  title: string;
};

export function SparePartsMasterModal({
  children,
  eyebrow = "Spare Parts Master Data",
  icon,
  subtitle,
  title,
}: SparePartsMasterModalProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeys);
      triggerRef.current?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);
  const closeFromContent = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest("[data-spare-parts-modal-close]")) close();
  };

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="group flex min-h-28 w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-[var(--ink)]">{title}</span>
          <span className="mt-1 block text-sm leading-5 text-[var(--muted)]">{subtitle}</span>
        </span>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--soft)] text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-white">
          <ArrowUpRight aria-hidden="true" size={17} />
        </span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-md sm:p-6"
              data-spare-parts-modal-backdrop
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <section
                aria-labelledby={titleId}
                aria-modal="true"
                className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-[var(--surface)] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
                ref={dialogRef}
                role="dialog"
              >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">{eyebrow}</p>
                      <h2 className="mt-1 text-xl font-extrabold sm:text-2xl" id={titleId}>{title}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
                    </div>
                  </div>
                  <button
                    aria-label={`ปิดหน้าต่าง ${title}`}
                    className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    onClick={close}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <X aria-hidden="true" size={19} />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6" onClick={closeFromContent}>
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
