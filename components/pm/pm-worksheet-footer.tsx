"use client";

import { ArrowLeft, Check, Pencil, Save } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";

export function PmWorksheetFooter({ backHref, completeAction, completed = false, completionFormId, editHref, editing = false }: {
  backHref: string;
  completeAction?: (data: FormData) => void | Promise<void>;
  completed?: boolean;
  completionFormId: string;
  editHref?: string;
  editing?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState("");
  const worksheetDataRef = useRef<HTMLInputElement>(null);

  function saveAllDrafts() {
    document.querySelectorAll<HTMLButtonElement>("[data-pm-draft-save]").forEach((button) => button.click());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function prepareSubmission(event: FormEvent<HTMLFormElement>) {
    const checklistForms = Array.from(document.querySelectorAll<HTMLFormElement>("[data-pm-checklist-form]"));
    const invalidForm = checklistForms.find((form) => !form.checkValidity());
    if (invalidForm) {
      event.preventDefault();
      setValidationError("กรุณาใส่ข้อมูลให้ครบ");
      const invalidControl = invalidForm.querySelector<HTMLElement>(":invalid");
      invalidControl?.closest("tr")?.scrollIntoView({ behavior: "smooth", block: "center" });
      invalidControl?.focus({ preventScroll: true });
      invalidForm.reportValidity();
      return;
    }

    setValidationError("");
    saveAllDrafts();
    const values: Record<string, string> = {};
    document.querySelectorAll<HTMLFormElement>("[data-pm-checklist-form]").forEach((form) => {
      for (const [name, value] of new FormData(form).entries()) {
        if (typeof value === "string") values[name] = value;
      }
    });
    if (worksheetDataRef.current) worksheetDataRef.current.value = JSON.stringify(values);
  }

  return <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4" data-pm-no-print>
    <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-bold shadow-sm transition hover:border-[var(--primary)]" href={backHref}>
      <ArrowLeft aria-hidden="true" size={18} />
      ย้อนกลับ
    </Link>
    <div className="flex flex-wrap items-center justify-end gap-3">
      {validationError ? <p className="basis-full text-right text-sm font-extrabold text-red-600" role="alert">{validationError}</p> : null}
      {!completed || editing ? <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 font-bold shadow-sm transition hover:border-emerald-500" onClick={saveAllDrafts} type="button">
        <Save aria-hidden="true" size={18} />
        {saved ? "บันทึกร่างแล้ว" : "บันทึกร่าง"}
      </button> : null}
      {completeAction ? <form action={completeAction} id={completionFormId} onSubmit={prepareSubmission}>
        <input name="worksheetDataJson" ref={worksheetDataRef} type="hidden" />
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-extrabold text-white shadow-sm transition hover:brightness-95" type="submit">
          {editing ? <Save aria-hidden="true" size={19} /> : <Check aria-hidden="true" size={19} strokeWidth={3} />}
          {editing ? "บันทึกการแก้ไข" : "ส่งใบงาน / เสร็จสิ้น"}
        </button>
      </form> : completed && editHref ? <>
        <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-5 font-extrabold text-emerald-800">
          <Check aria-hidden="true" size={19} /> ดำเนินการเสร็จสิ้น
        </span>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-400" href={editHref}>
          <Pencil aria-hidden="true" size={18} /> แก้ไขใบงาน
        </Link>
      </> : <button className={`inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl px-6 font-extrabold ${completed ? "bg-emerald-100 text-emerald-800" : "bg-slate-300 text-slate-600"}`} disabled type="button">
        <Check aria-hidden="true" size={19} />
        {completed ? "ส่งใบงานแล้ว · COMPLETED" : "ส่งใบงาน / เสร็จสิ้น"}
      </button>}
    </div>
  </footer>;
}
