"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white print:hidden" type="button" onClick={() => window.print()}>
      <Printer aria-hidden="true" size={18} />
      Print / Save PDF
    </button>
  );
}
