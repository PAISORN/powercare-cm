"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function PmConfirmPlanDialog({ action, hiddenFields, eligibleAssetCount, emptyGroupCount }: { action: (data: FormData) => void | Promise<void>; hiddenFields: Array<{ name: string; value: string }>; eligibleAssetCount: number; emptyGroupCount: number }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  useEffect(() => { if (open) dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [open]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])];
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-50" disabled={eligibleAssetCount === 0} onClick={() => setOpen(true)} ref={triggerRef} type="button"><CheckCircle2 size={18} />ยืนยันแผน PM</button>{open ? <div aria-describedby="pm-confirm-description" aria-labelledby="pm-confirm-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onKeyDown={onKeyDown} ref={dialogRef} role="dialog"><section className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-emerald-700">ยืนยันครั้งสุดท้าย</p><h3 className="mt-1 text-xl font-extrabold" id="pm-confirm-title">สร้างงาน PM {eligibleAssetCount} รายการ</h3></div><button aria-label="ปิดหน้าต่างยืนยัน" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--line)]" onClick={close} type="button"><X size={18} /></button></div><p className="mt-3 text-sm text-[var(--muted)]" id="pm-confirm-description">หลังยืนยัน รายชื่อ Asset และเลขแผนจะถูกเก็บเป็น Snapshot และแก้ไขกลุ่มย้อนหลังไม่ได้</p>{emptyGroupCount ? <p className="mt-3 rounded-2xl bg-amber-500/10 p-3 text-sm text-amber-800" role="status">มีกลุ่มว่าง {emptyGroupCount} กลุ่ม ระบบจะไม่สร้างงานจากกลุ่มเหล่านี้</p> : null}<form action={action} className="mt-5 grid grid-cols-2 gap-3">{hiddenFields.map(field => <input key={field.name} name={field.name} type="hidden" value={field.value} />)}<button className="min-h-12 rounded-2xl border border-[var(--line)] font-bold" onClick={close} type="button">ย้อนกลับ</button><button className="min-h-12 rounded-2xl bg-emerald-600 px-4 font-bold text-white" type="submit">ยืนยันและสร้างงาน</button></form></section></div> : null}</>;
}
