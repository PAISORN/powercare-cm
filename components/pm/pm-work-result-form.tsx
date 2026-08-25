"use client";

import { useState } from "react";

export function PmWorkResultForm({ action, correction = false, defaultResult = "NORMAL", defaultNote = "" }: {
  action: (data: FormData) => void | Promise<void>;
  correction?: boolean;
  defaultResult?: string;
  defaultNote?: string;
}) {
  const [result, setResult] = useState(defaultResult);
  return <form action={action} className="grid gap-4 rounded-2xl border border-[var(--line)] p-4">
    <label className="grid gap-1 text-sm font-bold">Result
      <select aria-label="PM result" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" name="result" onChange={event => setResult(event.target.value)} value={result}>
        <option value="NORMAL">Normal</option><option value="ABNORMAL">Abnormal</option>
      </select>
    </label>
    <label className="grid gap-1 text-sm font-bold">Result note
      <textarea className="min-h-24 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3" defaultValue={defaultNote} name="note" required={result === "ABNORMAL"} />
      {result === "ABNORMAL" ? <span className="text-xs text-amber-700">A note is required for an abnormal result.</span> : null}
    </label>
    {correction ? <label className="grid gap-1 text-sm font-bold">Correction reason<input className="min-h-11 rounded-xl border border-[var(--line)] px-3" name="reason" required /></label> : null}
    <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 font-bold text-white sm:justify-self-end" type="submit">{correction ? "Save correction" : "Complete PM"}</button>
  </form>;
}
