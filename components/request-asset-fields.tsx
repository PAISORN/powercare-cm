"use client";

import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AssetSearchField, type RepairAssetOption } from "./asset-search-field";

type ZoneOption = { id: string; name: string };

export function RequestAssetFields({ zones, assets }: { zones: ZoneOption[]; assets: RepairAssetOption[] }) {
  const [zoneId, setZoneId] = useState("");
  const filteredAssets = useMemo(() => assets.filter((asset) => asset.zoneId === zoneId), [assets, zoneId]);

  return <>
    <ZoneSearchField zones={zones} onSelect={setZoneId}/>
    <AssetSearchField assets={filteredAssets} disabled={!zoneId} key={zoneId||"no-zone"}/>
  </>;
}

function ZoneSearchField({ zones, onSelect }: { zones: ZoneOption[]; onSelect: (zoneId: string) => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const options = useMemo(
    () => zones.filter((zone) => zone.name.toLocaleLowerCase().includes(normalizedQuery)).slice(0, 20),
    [zones, normalizedQuery],
  );

  function selectZone(zone: ZoneOption) {
    setSelectedId(zone.id);
    setQuery(zone.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(zone.id);
  }

  return <div className="relative">
    <input name="zoneId" type="hidden" value={selectedId}/>
    <label className="grid gap-1 text-sm font-bold text-[var(--ink)]" htmlFor="zoneSearch">Zone</label>
    <div className="relative mt-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/>
      <input
        aria-activedescendant={activeIndex >= 0 ? "repair-zone-" + activeIndex : undefined}
        aria-autocomplete="list"
        aria-controls="repair-zone-options"
        aria-expanded={open}
        aria-haspopup="listbox"
        autoComplete="off"
        className="min-h-12 w-full rounded-md border bg-white py-3 pl-10 pr-3 text-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={!zones.length}
        id="zoneSearch"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { event.currentTarget.setCustomValidity("กรุณาเลือก Zone จากรายการ"); setQuery(event.target.value); setSelectedId(""); onSelect(""); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => {
              if (!options.length) return -1;
              return event.key === "ArrowDown" ? (current + 1) % options.length : (current <= 0 ? options.length - 1 : current - 1);
            });
          }
          if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) {
            event.preventDefault();
            selectZone(options[activeIndex]);
          }
        }}
        placeholder={zones.length ? "พิมพ์ค้นหา Zone" : "ยังไม่มี Zone สำหรับ Site นี้"}
        required
        role="combobox"
        value={query}
      />
    </div>
    {open ? <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-2xl" id="repair-zone-options" role="listbox">
      {options.length ? options.map((zone,index)=><button
        aria-selected={selectedId===zone.id}
        className={"flex min-h-12 w-full items-center rounded-lg px-3 py-2 text-left font-bold text-[var(--ink)] hover:bg-[var(--soft)] " + (activeIndex===index ? "bg-[var(--soft)]" : "")}
        id={"repair-zone-" + index}
        key={zone.id}
        onMouseDown={(event)=>event.preventDefault()}
        onClick={()=>selectZone(zone)}
        role="option"
        type="button"
      >{zone.name}</button>) : <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">ไม่พบ Zone</p>}
    </div> : null}
    <p className="mt-1 text-xs text-[var(--muted)]">ค้นหาและเลือก Zone ก่อนค้นหาเครื่องจักร</p>
  </div>;
}
