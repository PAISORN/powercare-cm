"use client";

import { ArrowLeft, Check, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function PmWorksheetFooter({ backHref, completeHref }: { backHref: string; completeHref?: string }) {
  const [saved, setSaved] = useState(false);

  function saveAllDrafts() {
    document.querySelectorAll<HTMLButtonElement>("[data-pm-draft-save]").forEach((button) => button.click());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
    <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-bold shadow-sm transition hover:border-[var(--primary)]" href={backHref}>
      <ArrowLeft aria-hidden="true" size={18} />
      ย้อนกลับ
    </Link>
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-bold shadow-sm transition hover:border-emerald-500" onClick={saveAllDrafts} type="button">
        <Save aria-hidden="true" size={18} />
        {saved ? "บันทึกร่างแล้ว" : "บันทึกร่าง"}
      </button>
      {completeHref ? <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-extrabold text-white shadow-sm transition hover:brightness-95" href={completeHref}>
        <Check aria-hidden="true" size={19} strokeWidth={3} />
        ส่งใบงาน / เสร็จสิ้น
      </Link> : <button className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-6 font-extrabold text-slate-600" disabled type="button">
        <Check aria-hidden="true" size={19} />
        ส่งใบงาน / เสร็จสิ้น
      </button>}
    </div>
  </footer>;
}
