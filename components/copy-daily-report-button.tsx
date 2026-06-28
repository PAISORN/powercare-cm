"use client";

import { Clipboard, Check } from "lucide-react";
import { useState } from "react";

export function CopyDailyReportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyReport() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold transition hover:bg-[var(--soft)]"
      type="button"
      onClick={copyReport}
    >
      {copied ? <Check aria-hidden="true" size={17} /> : <Clipboard aria-hidden="true" size={17} />}
      {copied ? "คัดลอกแล้ว" : "คัดลอกสรุป"}
    </button>
  );
}
