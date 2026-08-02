"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      onClick={(event) => { if (!window.confirm(`ยืนยันลบ ${label}? การดำเนินการนี้ย้อนกลับไม่ได้`)) event.preventDefault(); }}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 text-sm font-bold text-red-600 transition hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
    >
      <Trash2 size={16} /> ลบ
    </button>
  );
}
