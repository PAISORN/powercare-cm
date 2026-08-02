"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export type RepairAssetOption = {
  id: string;
  code: string | null;
  nameEn: string | null;
  nameTh: string;
  zoneId?: string | null;
};

function assetName(asset: RepairAssetOption) {
  return asset.nameEn?.trim() || asset.nameTh;
}

export function AssetSearchField({ assets, disabled=false }: { assets: RepairAssetOption[]; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const options = useMemo(() => {
    if (!normalizedQuery) return assets.slice(0, 20);
    return assets.filter((asset) =>
      [asset.code, asset.nameEn, asset.nameTh].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
    ).slice(0, 20);
  }, [assets, normalizedQuery]);

  function selectAsset(asset: RepairAssetOption) {
    setSelectedId(asset.id);
    setQuery(assetName(asset));
    setOpen(false);
    setActiveIndex(-1);
  }

  return <div className="relative">
    <input name="assetId" type="hidden" value={selectedId}/>
    <label className="grid gap-1 text-sm font-bold text-[var(--ink)]" htmlFor="machineName">ชื่อเครื่องจักร</label>
    <div className="relative mt-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18}/>
      <input
        aria-activedescendant={activeIndex >= 0 ? `repair-asset-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls="repair-asset-options"
        aria-expanded={open}
        aria-haspopup="listbox"
        autoComplete="off"
        className="min-h-12 w-full rounded-md border bg-white py-3 pl-10 pr-3 text-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        disabled={disabled}
        id="machineName"
        name="machineName"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => { setQuery(event.target.value); setSelectedId(""); setOpen(true); setActiveIndex(-1); }}
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
            selectAsset(options[activeIndex]);
          }
        }}
        placeholder={disabled?"กรุณาเลือก Zone ก่อน":"พิมพ์ชื่อหรือรหัสเครื่องจักร"}
        required
        role="combobox"
        value={query}
      />
    </div>
    {open ? <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-2xl" id="repair-asset-options" role="listbox">
      {options.length ? options.map((asset,index)=><button
        aria-selected={selectedId===asset.id}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--soft)] ${activeIndex===index?"bg-[var(--soft)]":""}`}
        id={`repair-asset-${index}`}
        key={asset.id}
        onMouseDown={(event)=>event.preventDefault()}
        onClick={()=>selectAsset(asset)}
        role="option"
        type="button"
      ><span className="min-w-0"><span className="block truncate font-bold text-[var(--ink)]">{assetName(asset)}</span><span className="block truncate font-mono text-xs font-bold text-emerald-700">{asset.code||"ยังไม่มีรหัส"}</span></span>{asset.nameTh&&asset.nameTh!==assetName(asset)?<span className="shrink-0 text-xs text-[var(--muted)]">{asset.nameTh}</span>:null}</button>)
      : <p className="px-3 py-4 text-center text-sm text-[var(--muted)]">ไม่พบเครื่องจักร — สามารถใช้ชื่อที่พิมพ์แจ้งซ่อมได้</p>}
    </div>:null}
    <p className="mt-1 text-xs text-[var(--muted)]">{disabled?"ระบบจะแสดงเฉพาะเครื่องจักรที่อยู่ใน Zone ที่เลือก":"เลือกจากผลค้นหาเพื่อเชื่อมกับทะเบียน Assets หรือพิมพ์ชื่อใหม่ได้"}</p>
  </div>;
}
