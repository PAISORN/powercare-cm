"use client";

import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";

function printWorksheet() {
  const cleanup = () => document.body.classList.remove("pm-worksheet-printing");
  document.body.classList.add("pm-worksheet-printing");
  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}

export function PmWorksheetPrintButton({
  autoPrint = false,
  disabled = false,
}: {
  autoPrint?: boolean;
  disabled?: boolean;
}) {
  const autoPrinted = useRef(false);

  useEffect(() => {
    if (!autoPrint || disabled || autoPrinted.current) return;
    autoPrinted.current = true;
    const frame = window.requestAnimationFrame(() =>
      window.requestAnimationFrame(printWorksheet),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [autoPrint, disabled]);

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--ink)] shadow-sm transition enabled:hover:border-[var(--primary)] enabled:hover:text-[var(--primary)] enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
      data-pm-no-print
      disabled={disabled}
      onClick={printWorksheet}
      type="button"
    >
      <Printer aria-hidden="true" size={18} />
      พิมพ์ / บันทึก PDF
    </button>
  );
}
