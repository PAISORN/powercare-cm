"use client";

import { CheckCircle2, LoaderCircle, PencilLine, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

type RequestReview = {
  requesterName: string;
  requesterDepartment: string;
  category: string;
  zone: string;
  machineName: string;
  problemTitle: string;
  problemDetail: string;
  urgency: string;
};

export function RequestSubmitButton() {
  const { pending } = useFormStatus();
  const [review, setReview] = useState<RequestReview | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const confirmedSubmitRef = useRef(false);

  const openReviewForForm = useCallback((form: HTMLFormElement | null | undefined) => {
    if (!form || !form.reportValidity()) return;

    const formData = new FormData(form);
    setReview({
      requesterName: formValue(formData, "requesterName"),
      requesterDepartment: formValue(formData, "requesterDepartment"),
      category: selectedOptionText(form, "categoryId"),
      zone: selectedOptionText(form, "zoneId"),
      machineName: formValue(formData, "machineName"),
      problemTitle: formValue(formData, "problemTitle"),
      problemDetail: formValue(formData, "problemDetail"),
      urgency: selectedOptionText(form, "urgency"),
    });
  }, []);

  useEffect(() => {
    const form = submitButtonRef.current?.form;
    if (!form) return;

    function interceptDirectSubmit(event: SubmitEvent) {
      if (confirmedSubmitRef.current) {
        confirmedSubmitRef.current = false;
        return;
      }
      event.preventDefault();
      openReviewForForm(form);
    }

    form.addEventListener("submit", interceptDirectSubmit);
    return () => form.removeEventListener("submit", interceptDirectSubmit);
  }, [openReviewForForm]);

  function openReview(event: MouseEvent<HTMLButtonElement>) {
    openReviewForForm(event.currentTarget.form);
  }

  function confirmSubmission() {
    const form = submitButtonRef.current?.form;
    if (!form || !submitButtonRef.current || pending) return;
    confirmedSubmitRef.current = true;
    form.requestSubmit(submitButtonRef.current);
  }

  return (
    <>
      <button
        aria-disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:cursor-wait disabled:opacity-65"
        disabled={pending}
        onClick={openReview}
        type="button"
      >
        {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
        {pending ? "กำลังส่งใบแจ้งซ่อม..." : "ตรวจสอบก่อนส่งแจ้งซ่อม"}
      </button>
      <button aria-hidden="true" className="hidden" ref={submitButtonRef} tabIndex={-1} type="submit" />

      {review ? (
        <div
          aria-labelledby="request-review-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <section className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 size={24} />
                </span>
                <div>
                  <p className="text-sm font-bold text-[var(--primary)]">ตรวจสอบข้อมูล</p>
                  <h2 className="mt-1 text-xl font-extrabold text-[var(--ink)] sm:text-2xl" id="request-review-title">
                    ยืนยันส่งใบแจ้งซ่อม
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนส่งเข้าระบบ</p>
                </div>
              </div>
              <button
                aria-label="ปิดหน้าต่างตรวจสอบ"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] transition hover:bg-[var(--soft)]"
                onClick={() => setReview(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <ReviewItem label="ผู้แจ้ง" value={review.requesterName} />
              <ReviewItem label="หน่วยงาน / แผนก" value={review.requesterDepartment} />
              <ReviewItem label="Category" value={review.category} />
              <ReviewItem label="Zone" value={review.zone} />
              <ReviewItem label="ชื่อเครื่องจักร" value={review.machineName} />
              <ReviewItem label="ความเร่งด่วน" value={review.urgency} />
              <ReviewItem className="sm:col-span-2" label="หัวข้อปัญหา" value={review.problemTitle} />
              <ReviewItem className="sm:col-span-2" label="รายละเอียดปัญหา" value={review.problemDetail} />
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[var(--line)] bg-[var(--soft)]/65 p-4 sm:flex-row sm:justify-end sm:p-5">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                disabled={pending}
                onClick={() => setReview(null)}
                type="button"
              >
                <PencilLine size={18} />
                กลับไปแก้ไข
              </button>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-wait disabled:opacity-65"
                disabled={pending}
                onClick={confirmSubmission}
                type="button"
              >
                {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
                {pending ? "กำลังส่ง..." : "ยืนยันส่งแจ้งซ่อม"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ReviewItem({ className = "", label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 ${className}`}>
      <p className="text-xs font-bold uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words font-semibold text-[var(--ink)]">{value || "-"}</p>
    </div>
  );
}

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function selectedOptionText(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLSelectElement ? field.selectedOptions[0]?.textContent?.trim() ?? "" : "";
}
