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
    <div className="flex min-h-16 items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-4 py-3 transition-colors">
      <input name={name} type="hidden" value={allowed ? "ALLOW" : "DENY"} />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
      </span>
      <button
        aria-checked={allowed}
        aria-label={`${title}: ${allowed ? "Allow" : "Deny"}`}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
          allowed
            ? "bg-[var(--primary)]"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
        onClick={() => setAllowed((current) => !current)}
        role="switch"
        type="button"
      >
        <span
          className={`size-5 rounded-full bg-white shadow transition-transform ${
            allowed ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{allowed ? "เปิด" : "ปิด"}</span>
      </button>
    </div>
  );
}
