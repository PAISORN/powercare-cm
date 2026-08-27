"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function friendlyErrorMessage(value: string | null | undefined) {
  const message = safeDecode(value?.trim() ?? "");
  if (!message || message === "1" || message === "Unknown error") {
    return "ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง";
  }
  const knownMessages: Record<string, string> = {
    "invalid-json": "รูปแบบข้อมูลไม่ถูกต้อง กรุณาเลือกไฟล์หรือกรอกข้อมูลใหม่",
    "invalid-count": "จำนวนรายการไม่ถูกต้อง กรุณาตรวจสอบจำนวนข้อมูลแล้วลองอีกครั้ง",
  };
  if (knownMessages[message]) return knownMessages[message];
  if (/[฀-๿]/.test(message)) return message;
  if (/not found/i.test(message)) return "ไม่พบข้อมูลที่ต้องการ หรือข้อมูลอาจถูกย้ายหรือลบแล้ว";
  if (/permission|not allowed|cannot manage|outside .*scope/i.test(message)) {
    return "คุณไม่มีสิทธิ์ดำเนินการนี้ กรุณาติดต่อผู้ดูแลระบบ";
  }
  if (/required|incomplete|invalid/i.test(message)) {
    return "ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง";
  }
  if (/already|duplicate|unique/i.test(message)) {
    return "ข้อมูลนี้มีอยู่แล้ว กรุณาตรวจสอบข้อมูลที่กรอก";
  }
  return "เกิดข้อผิดพลาดขณะดำเนินการ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง";
}

export function SystemErrorPopup({
  message,
  onClose,
  title = "ไม่สามารถดำเนินการได้",
}: {
  message: string;
  onClose: () => void;
  title?: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      aria-describedby="system-error-message"
      aria-labelledby="system-error-title"
      aria-modal="true"
      className="fixed inset-0 z-[500] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-md"
      role="alertdialog"
    >
      <section className="w-full max-w-md rounded-3xl border border-red-200/70 bg-[var(--surface-raised)] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <AlertTriangle aria-hidden="true" size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold text-[var(--ink)]" id="system-error-title">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--muted)]" id="system-error-message">{message}</p>
          </div>
          <button
            aria-label="ปิดข้อความแจ้งข้อผิดพลาด"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] transition hover:border-red-300 hover:text-red-600"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <button
          className="mt-5 min-h-11 w-full rounded-xl bg-[var(--primary)] px-4 font-bold text-white transition hover:bg-[var(--primary-strong)]"
          onClick={onClose}
          type="button"
        >
          ปิดและใช้งานต่อ
        </button>
      </section>
    </div>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
