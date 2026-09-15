"use client";

import { useEffect } from "react";
import { BookOpen, ExternalLink, X } from "lucide-react";
import type { AssetTreeItem } from "./asset-tree-workspace";
import { PreserveListPositionLink } from "./preserve-list-position";

export function AssetTreeDetailDialog({ asset, onClose }: { asset: AssetTreeItem; onClose: () => void }) {
  useModalBehavior(onClose);

  return <>
    <button aria-label="ปิดรายละเอียด Asset" className="fixed inset-0 z-[80] cursor-default bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button"/>
    <section aria-labelledby="asset-detail-dialog-title" aria-modal="true" className="fixed inset-x-4 bottom-4 top-4 z-[90] mx-auto flex max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:inset-x-8 sm:bottom-8 sm:top-8" role="dialog">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-emerald-700"><BookOpen size={16}/>Asset details</p>
          <h2 className="mt-1 truncate text-2xl font-black" id="asset-detail-dialog-title">{asset.name}</h2>
          <p className="mt-1 font-mono text-sm font-bold text-emerald-700">{asset.code}</p>
        </div>
        <button aria-label="ปิด" autoFocus className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" onClick={onClose} type="button"><X size={21}/></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        {asset.imageUrl ? <img alt={`รูป ${asset.name}`} className="mb-6 h-52 w-full rounded-2xl border border-slate-200 bg-slate-50 object-contain" src={asset.imageUrl}/> : null}
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {asset.details.map(detail => <div className="grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)] border-b border-slate-200 py-3.5 text-sm" key={detail.label}>
            <dt className="pr-4 font-bold text-slate-500">{detail.label}</dt>
            <dd className="border-l border-slate-200 pl-4 font-bold text-slate-900">{detail.value || "ยังไม่ระบุ"}</dd>
          </div>)}
        </dl>
      </div>
      <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
        <button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={onClose} type="button">ปิด</button>
        <PreserveListPositionLink className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700" href={asset.detailHref} storageKey="assets" targetId={`asset-tree-row-${asset.id}`}><ExternalLink size={17}/>เปิดหน้ารายละเอียดเต็ม</PreserveListPositionLink>
      </footer>
    </section>
  </>;
}

function useModalBehavior(onClose: () => void) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);
}
