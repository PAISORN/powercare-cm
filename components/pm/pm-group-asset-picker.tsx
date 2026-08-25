"use client";

import { AlertTriangle, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

export type PmGroupAssetOption = {
  id: string;
  code: string | null;
  nameTh: string;
  nameEn?: string | null;
  typeName?: string | null;
  zoneName?: string | null;
  operatingStatus: string;
};

export function PmGroupAssetPicker({
  assets,
  defaultSelectedIds = [],
  staleAssets = [],
  name = "assetIds",
}: {
  assets: PmGroupAssetOption[];
  defaultSelectedIds?: string[];
  staleAssets?: PmGroupAssetOption[];
  name?: string;
}) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(defaultSelectedIds));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleAssets = useMemo(() => assets.filter((asset) => {
    if (!normalizedQuery) return true;
    return [asset.code, asset.nameTh, asset.nameEn, asset.typeName, asset.zoneName, asset.operatingStatus]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
  }), [assets, normalizedQuery]);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return <fieldset className="grid gap-3">
    <legend className="text-sm font-bold text-[var(--ink)]">Assets in this PM Group</legend>
    <p className="text-xs text-[var(--muted)]">Select registered Assets individually. Parent and Child Assets are not selected automatically.</p>
    {[...selectedIds].map((id) => <input key={id} name={name} type="hidden" value={id} />)}
    <label className="sr-only" htmlFor={searchId}>Search Assets</label>
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
      <input
        className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--soft)] py-3 pl-10 pr-3 text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        id={searchId}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by code, name, type, Zone, or status"
        type="search"
        value={query}
      />
    </div>
    <p aria-live="polite" className="text-xs font-semibold text-[var(--muted)]">
      {selectedIds.size} selected · {visibleAssets.length} shown
    </p>
    {staleAssets.length ? <div className="grid gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><AlertTriangle aria-hidden="true" size={17} />Unavailable current members</p>
      <p className="text-xs text-amber-800">These Assets are no longer active in this Site. Remove them before saving; they cannot be added again here.</p>
      {staleAssets.map((asset) => {
        const retained = selectedIds.has(asset.id);
        const title = asset.nameEn?.trim() || asset.nameTh;
        return <div className="flex min-h-14 items-center gap-3 rounded-xl border border-amber-500/30 bg-[var(--surface)] p-3" key={asset.id}>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-[var(--ink)]">{title} <span className="font-mono text-xs text-amber-700">{asset.code || "No code"}</span></span>
            <span className="mt-1 block text-xs text-amber-800">{retained ? "Must be removed before saving" : "Will be removed when saved"}</span>
          </span>
          <button
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-amber-600/40 px-3 text-sm font-bold text-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!retained}
            onClick={() => toggle(asset.id)}
            type="button"
          ><X aria-hidden="true" size={16} />{retained ? "Remove" : "Removed"}</button>
        </div>;
      })}
    </div> : null}
    <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-[var(--line)] p-2">
      {visibleAssets.map((asset) => {
        const checked = selectedIds.has(asset.id);
        const title = asset.nameEn?.trim() || asset.nameTh;
        return <label className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? "border-[var(--primary)] bg-[var(--soft)]" : "border-transparent hover:bg-[var(--soft)]"}`} key={asset.id}>
          <input checked={checked} className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]" onChange={() => toggle(asset.id)} type="checkbox" value={asset.id} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-bold text-[var(--ink)]">{title}</span>
              <span className="font-mono text-xs font-bold text-[var(--primary)]">{asset.code || "No code"}</span>
            </span>
            {asset.nameTh && asset.nameTh !== title ? <span className="mt-0.5 block text-sm text-[var(--muted)]">{asset.nameTh}</span> : null}
            <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
              <span>Type: {asset.typeName || "—"}</span><span>Zone: {asset.zoneName || "—"}</span><span>Status: {asset.operatingStatus}</span>
            </span>
          </span>
        </label>;
      })}
      {!visibleAssets.length ? <p className="px-3 py-8 text-center text-sm text-[var(--muted)]">No Assets match this search.</p> : null}
    </div>
  </fieldset>;
}
