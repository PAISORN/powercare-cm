"use client";

import { ImageIcon, Plus, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const outcomes = [
  { value: "NORMAL", label: "เสร็จสิ้น (ปกติ)" },
  { value: "ABNORMAL", label: "เสร็จสิ้น (พบปัญหา / แจ้งซ่อม)" },
  { value: "UNABLE", label: "ไม่สามารถดำเนินการได้" },
] as const;

export function PmWorksheetSummaryForm() {
  const [note, setNote] = useState("");
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const previewUrls = useRef<string[]>([]);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function selectImages(files: FileList | null) {
    const selected = Array.from(files ?? [])
      .filter((file) => ["image/jpeg", "image/png"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    setPreviews((current) => {
      const additions = selected.slice(0, Math.max(0, 5 - current.length)).map((file) => {
        const url = URL.createObjectURL(file);
        previewUrls.current.push(url);
        return { name: file.name, url };
      });
      return [...current, ...additions];
    });
  }

  function removeImage(index: number) {
    setPreviews((current) => {
      const target = current[index];
      if (target) {
        URL.revokeObjectURL(target.url);
        previewUrls.current = previewUrls.current.filter((url) => url !== target.url);
      }
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  return <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
    <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="p-4 sm:p-5 lg:border-r lg:border-[var(--line)]">
        <h2 className="flex items-center gap-2 text-lg font-black"><Wrench className="text-[var(--primary)]" size={20} />สรุปผลการปฏิบัติงาน</h2>
        <fieldset className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          <legend className="sr-only">ผลสรุปการปฏิบัติงาน</legend>
          {outcomes.map((outcome) => <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm font-bold" key={outcome.value}>
            <input className="size-5 accent-[var(--primary)]" name="summaryResult" type="radio" value={outcome.value} />
            <span>{outcome.label}</span>
          </label>)}
        </fieldset>
        <label className="mt-2 block text-sm font-bold">
          หมายเหตุเพิ่มเติม
          <span className="relative mt-2 block">
            <textarea
              className="min-h-16 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 pb-7 outline-none focus:ring-2 focus:ring-[var(--primary)]"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="ระบุหมายเหตุ (ถ้ามี) ..."
              value={note}
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs font-semibold text-[var(--muted)]">{note.length}/500</span>
          </span>
        </label>
      </div>

      <div className="border-t border-[var(--line)] p-4 sm:p-5 lg:border-t-0">
        <h2 className="flex items-center gap-2 text-lg font-black"><ImageIcon className="text-[var(--primary)]" size={20} />รูปภาพเพิ่มเติม</h2>
        <p className="mt-2 text-xs text-[var(--muted)]">แนบแล้ว {previews.length}/5 รูป · รองรับ JPG และ PNG ไฟล์ละไม่เกิน 10 MB</p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {previews.map((preview, index) => <div className="relative size-32 shrink-0" key={preview.url}>
            <img alt={preview.name} className="h-full w-full rounded-xl border border-[var(--line)] object-cover" src={preview.url} />
            <button
              aria-label={`ลบรูป ${preview.name}`}
              className="absolute right-1 top-1 grid size-7 place-items-center rounded-full border border-red-200 bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              onClick={() => removeImage(index)}
              type="button"
            >
              <X aria-hidden="true" size={16} strokeWidth={3} />
            </button>
          </div>)}
          {previews.length < 5 ? <label className="flex size-32 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--soft)] p-3 text-center transition hover:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]">
            <Plus className="text-[var(--primary)]" size={28} />
            <span className="mt-2 text-sm font-extrabold">เพิ่มรูปภาพ</span>
            <span className="mt-0.5 text-xs text-[var(--muted)]">สูงสุด 5 รูป</span>
            <input
              accept="image/jpeg,image/png"
              className="sr-only"
              multiple
              name="worksheetImages"
              onChange={(event) => selectImages(event.target.files)}
              type="file"
            />
          </label> : null}
        </div>
      </div>
    </div>
  </section>;
}
