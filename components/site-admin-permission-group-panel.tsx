"use client";

import { useState } from "react";
import type { PermissionOption } from "../modules/auth/site-admin-permissions";

type SiteAdminPermissionGroupPanelProps = {
  disabled?: boolean;
  enabledCount: number;
  enabledPermissionKeys: string[];
  groupName: string;
  options: readonly PermissionOption[];
};

export function SiteAdminPermissionGroupPanel({
  disabled = false,
  enabledCount,
  enabledPermissionKeys,
  groupName,
  options,
}: SiteAdminPermissionGroupPanelProps) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set(enabledPermissionKeys));

  function setGroupChecked(checked: boolean) {
    if (disabled) return;
    setSelectedKeys(checked ? new Set(options.map((option) => option.key)) : new Set());
  }

  function togglePermission(permissionKey: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(permissionKey);
      else next.delete(permissionKey);
      return next;
    });
  }

  const selectedCount = selectedKeys.size;

  return (
    <fieldset aria-label={`${groupName}: ${enabledCount} initially enabled`} className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <legend className="px-1 text-sm font-extrabold text-[var(--ink)]">{groupName}</legend>
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
          {selectedCount}/{options.length} enabled
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setGroupChecked(true)}
          type="button"
        >
          Select all
        </button>
        <button
          className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-red-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => setGroupChecked(false)}
          type="button"
        >
          Clear group
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <label key={option.key} className="flex min-h-11 items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-2 text-sm font-semibold">
            <input
              checked={selectedKeys.has(option.key)}
              className="h-4 w-4"
              disabled={disabled}
              name="permissionKey"
              onChange={(event) => togglePermission(option.key, event.target.checked)}
              type="checkbox"
              value={option.key}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
