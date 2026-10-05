"use client";

import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type StoredDraft = {
  values: Record<string, string>;
  savedAt: string;
};

export function PmSubAssetDraftButton({ draftKey, readOnly = false }: { draftKey: string; readOnly?: boolean }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as StoredDraft;
      const form = buttonRef.current?.closest("form");
      if (!form) return;
      for (const [name, value] of Object.entries(draft.values)) {
        const controls = Array.from(form.elements).filter((control): control is HTMLInputElement =>
          control instanceof HTMLInputElement && control.name === name
        );
        for (const control of controls) {
          if (control.type === "radio") control.checked = control.value === value;
          else if (control.type !== "file") control.value = value;
        }
      }
      setSavedAt(draft.savedAt);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  function saveDraft() {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const values: Record<string, string> = {};
    for (const [name, value] of new FormData(form).entries()) {
      if (typeof value === "string") values[name] = value;
    }
    const savedAtValue = new Date().toISOString();
    window.localStorage.setItem(draftKey, JSON.stringify({ values, savedAt: savedAtValue } satisfies StoredDraft));
    setSavedAt(savedAtValue);
  }

  return <div className={readOnly ? "hidden" : "flex flex-col items-end gap-1"}>
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      data-pm-draft-save
      disabled={readOnly}
      onClick={saveDraft}
      ref={buttonRef}
      type="button"
    >
      <Save aria-hidden="true" size={17} />
      บันทึกร่าง
    </button>
    {savedAt ? <span className="text-xs font-semibold text-emerald-700">บันทึกแล้ว {new Date(savedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span> : null}
  </div>;
}
