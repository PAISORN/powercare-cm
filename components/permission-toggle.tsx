"use client";

import { useState } from "react";

export type PermissionToggleDecision = "INHERIT" | "ALLOW" | "DENY";

export function PermissionToggle({
  description,
  inheritedAllowed,
  initialDecision,
  name,
  title,
}: {
  description: string;
  inheritedAllowed: boolean;
  initialDecision: PermissionToggleDecision;
  name: string;
  title: string;
}) {
  const [decision, setDecision] = useState<PermissionToggleDecision>(initialDecision);
  const permissionKey = name.startsWith("permission:") ? name.slice("permission:".length) : name;
  const effectiveAllowed = decision === "INHERIT" ? inheritedAllowed : decision === "ALLOW";
  const changed = decision !== initialDecision;

  return (
    <div className="grid min-h-24 gap-3 rounded-xl bg-[var(--surface)] px-4 py-3">
      <input name={name} type="hidden" value={decision} />
      {changed ? <input name="changedPermissionKeys" type="hidden" value={permissionKey} /> : null}
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{description}</span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className={`text-xs font-bold ${effectiveAllowed ? "text-emerald-600" : "text-rose-600"}`}>
          มีผลจริง: {effectiveAllowed ? "Allow" : "Deny"}
        </span>
        <span aria-label={`${title}: ${decision}`} className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--soft)] p-1" role="group">
          {(["INHERIT", "ALLOW", "DENY"] as const).map((value) => (
            <button
              aria-pressed={decision === value}
              className={`min-h-8 rounded-lg px-2 text-[11px] font-extrabold transition ${
                decision === value ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              key={value}
              onClick={() => setDecision(value)}
              type="button"
            >
              {value === "INHERIT" ? "ตาม Role" : value === "ALLOW" ? "Allow" : "Deny"}
            </button>
          ))}
        </span>
      </span>
    </div>
  );
}
