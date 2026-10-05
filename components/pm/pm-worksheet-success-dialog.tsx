"use client";

import { Check, PartyPopper, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

const confetti = Array.from({ length: 24 }, (_, index) => ({
  color: ["#10b981", "#2563eb", "#f59e0b", "#ec4899", "#8b5cf6"][index % 5],
  delay: `${(index % 8) * 0.08}s`,
  left: `${8 + ((index * 37) % 84)}%`,
  rotate: `${(index * 47) % 180}deg`,
}));

export function PmWorksheetSuccessDialog({ backHref, updated = false }: { backHref: string; updated?: boolean }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation">
      <section
        aria-describedby="pm-worksheet-success-description"
        aria-labelledby="pm-worksheet-success-title"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white px-7 pb-7 pt-9 text-center text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
        data-pm-worksheet-success-dialog
        role="dialog"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden">
          {confetti.map((piece, index) => (
            <span
              className="absolute -top-5 h-3 w-2 animate-[pm-confetti-fall_1.7s_ease-out_both] rounded-sm motion-reduce:animate-none"
              data-pm-confetti
              key={index}
              style={{
                backgroundColor: piece.color,
                left: piece.left,
                animationDelay: piece.delay,
                transform: `rotate(${piece.rotate})`,
              } as CSSProperties}
            />
          ))}
        </div>
        <div className="relative mx-auto grid size-24 place-items-center rounded-full bg-emerald-100 text-emerald-700 shadow-[0_0_0_14px_rgba(16,185,129,0.08)]">
          <Check className="animate-[pm-success-pop_.55s_cubic-bezier(.2,.9,.25,1.25)_both] motion-reduce:animate-none" size={50} strokeWidth={3.5} />
          <Sparkles className="absolute -right-3 -top-2 text-amber-500" size={28} />
        </div>
        <div className="relative mt-7">
          <p className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700">
            <PartyPopper size={18} /> สำเร็จ
          </p>
          <h2 className="mt-2 text-3xl font-black" id="pm-worksheet-success-title">
            {updated ? "บันทึกการแก้ไขแล้ว" : "ส่งใบงานเรียบร้อยแล้ว"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600" id="pm-worksheet-success-description">
            {updated
              ? "ระบบบันทึกข้อมูลใบงานฉบับแก้ไขและประวัติผู้แก้ไขเรียบร้อยแล้ว"
              : "PM Work ถูกเปลี่ยนเป็นสถานะดำเนินการเสร็จสิ้นเรียบร้อยแล้ว"}
          </p>
        </div>
        <button
          autoFocus
          className="relative mt-7 min-h-12 w-full rounded-2xl bg-emerald-600 px-5 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
          onClick={() => router.push(backHref)}
          type="button"
        >
          OK · กลับไป PM Main Assets
        </button>
      </section>
    </div>
  );
}
