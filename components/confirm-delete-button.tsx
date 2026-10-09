"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({ label, message, compact = false }: { label: string; message?: string; compact?: boolean }) {
  return (
    <button
      aria-label={`ลบ ${label}`}
      type="submit"
      onClick={(event) => { if (!window.confirm(message ?? `ยืนยันลบ ${label}? การดำเนินการนี้ย้อนกลับไม่ได้`)) event.preventDefault(); }}
      className={`flex items-center justify-center gap-2 rounded-xl border border-red-500/30 text-sm font-bold text-red-600 transition hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${compact ? "size-10" : "min-h-11 px-4"}`}
    >
      <Trash2 size={16} /> {compact ? <span className="sr-only">ลบ</span> : "ลบ"}
    </button>
  );
}
