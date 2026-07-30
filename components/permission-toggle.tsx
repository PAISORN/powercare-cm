"use client";

import { useState } from "react";

export function PermissionToggle({
  defaultAllowed,
  description,
  name,
  title,
}: {
  defaultAllowed: boolean;
  description: string;
  name: string;
  title: string;
}) {
  const [allowed, setAllowed] = useState(defaultAllowed);

  return (
    <div
      className={`flex min-h-20 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${
        allowed
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-slate-400/35 bg-[var(--soft)]/65"
      }`}
    >
      <input name={name} type="hidden" value={allowed ? "ALLOW" : "DENY"} />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="block truncate text-xs text-[var(--muted)]">{description}</span>
      </span>
      <button
        aria-checked={allowed}
        aria-label={`${title}: ${allowed ? "Allow" : "Deny"}`}
        className={`relative inline-flex h-9 w-[72px] shrink-0 items-center rounded-full border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
          allowed
            ? "border-emerald-500 bg-emerald-500"
            : "border-slate-400/60 bg-slate-400/35"
        }`}
        onClick={() => setAllowed((current) => !current)}
        role="switch"
        type="button"
      >
        <span
          className={`grid size-7 place-items-center rounded-full bg-white text-[10px] font-black shadow-md transition-transform ${
            allowed ? "translate-x-8 text-emerald-600" : "translate-x-0 text-slate-500"
          }`}
        >
          {allowed ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
