"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CircleDot, CircuitBoard, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { PreserveListPositionLink } from "./preserve-list-position";

export type TechnicalFieldTreeField = {
  id: string;
  label: string;
  dataType: string;
  unit: string | null;
  active: boolean;
  valuesCount: number;
  editHref: string;
};

export type TechnicalFieldTreeType = {
  id: string;
  code: string;
  name: string;
  addHref: string;
  fields: TechnicalFieldTreeField[];
};

const gridClass = "grid min-w-[900px] grid-cols-[minmax(390px,2fr)_minmax(150px,.8fr)_minmax(130px,.65fr)_minmax(190px,.9fr)]";
const positionKey = "asset-master:technical-fields";

export function TechnicalFieldTree({ types }: { types: TechnicalFieldTreeType[] }) {
  const expandableIds = useMemo(() => new Set(types.filter((type) => type.fields.length).map((type) => type.id)), [types]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section aria-label="Technical Field Templates tree" className="overflow-hidden text-slate-900" style={{ colorScheme: "light" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <p className="text-xs font-semibold text-slate-500">Asset Types {types.length} รายการ · Technical Fields {types.reduce((sum, type) => sum + type.fields.length, 0)} รายการ</p>
        <div className="flex gap-2" role="toolbar" aria-label="ควบคุม Technical Field Templates tree">
          <button className={toolbarButton} onClick={() => setExpanded(new Set(expandableIds))} type="button"><PanelLeftOpen aria-hidden="true" size={15}/>ขยายทั้งหมด</button>
          <button className={toolbarButton} onClick={() => setExpanded(new Set())} type="button"><PanelLeftClose aria-hidden="true" size={15}/>ย่อทั้งหมด</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={`${gridClass} sticky top-0 z-20 border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-xs font-black uppercase tracking-[.08em] text-slate-700`} role="row">
          <span role="columnheader">Technical Field Templates</span>
          <span role="columnheader">Data Type</span>
          <span role="columnheader">Unit</span>
          <span role="columnheader">Status</span>
        </div>

        <div role="tree" aria-label="Technical Field Templates hierarchy">
          {types.map((type, typeIndex) => {
            const open = expanded.has(type.id);
            return <section className="border-b border-slate-200 last:border-b-0" id={`technical-type-${type.id}`} key={type.id}>
              <div className={`${gridClass} min-h-[72px] items-center bg-violet-50/60 px-5 transition-colors hover:bg-violet-100/70`} role="row">
                <div className="flex min-w-0 items-center">
                  <button aria-label={`${open ? "ย่อ" : "ขยาย"} ${type.name}`} aria-expanded={open} className="grid h-10 w-8 shrink-0 place-items-center rounded-md text-slate-500 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:cursor-default disabled:opacity-40" disabled={!type.fields.length} onClick={() => toggle(type.id)} type="button">
                    {type.fields.length ? (open ? <ChevronDown aria-hidden="true" size={15}/> : <ChevronRight aria-hidden="true" size={15}/>) : <span aria-hidden="true"/>}
                  </button>
                  <CircuitBoard aria-hidden="true" className="ml-1 shrink-0 text-violet-500" size={18}/>
                  <span className="ml-3 w-7 shrink-0 font-mono text-xs font-black text-slate-500">{typeIndex + 1}.</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-black text-violet-950">{type.name}</span>
                    <span className="mt-0.5 block font-mono text-[11px] font-bold text-emerald-700">{type.code}</span>
                  </span>
                  <span className="ml-3 shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">{type.fields.length} รายการ</span>
                </div>
                <span className="text-sm text-slate-500">—</span>
                <span className="text-sm text-slate-500">—</span>
                <PreserveListPositionLink className="ml-auto flex min-h-10 w-fit items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700" href={type.addHref} storageKey={positionKey} targetId={`technical-type-${type.id}`}><Plus aria-hidden="true" size={14}/>เพิ่มรายการ</PreserveListPositionLink>
              </div>

              {open ? <div role="group">
                {type.fields.map((field, fieldIndex) => {
                  const last = fieldIndex === type.fields.length - 1;
                  return <div className="relative border-t border-slate-200" id={`technical-field-${field.id}`} key={field.id} role="treeitem" aria-level={2}>
                    <div className={`${gridClass} min-h-[68px] items-center px-5 transition-colors hover:bg-slate-50 focus-within:bg-slate-50`} role="row">
                      <div className="relative flex min-w-0 items-center pl-9 pr-5">
                        {last
                          ? <span aria-hidden="true" className="absolute left-[14px] top-[-34px] h-[68px] w-9 rounded-bl-lg border-b border-l border-slate-300"/>
                          : <><span aria-hidden="true" className="absolute bottom-[-34px] left-[14px] top-[-34px] border-l border-slate-300"/><span aria-hidden="true" className="absolute left-[14px] top-1/2 w-9 border-t border-slate-300"/></>}
                        <CircleDot aria-hidden="true" className="relative z-10 shrink-0 bg-white text-emerald-500" size={17}/>
                        <span className="relative z-10 ml-3 w-7 shrink-0 bg-white font-mono text-xs font-black text-slate-500">{fieldIndex + 1}.</span>
                        <PreserveListPositionLink className="relative z-10 min-w-0 truncate bg-white text-sm font-semibold text-slate-900 decoration-emerald-500 decoration-2 underline-offset-4 hover:text-emerald-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" href={field.editHref} storageKey={positionKey} targetId={`technical-field-${field.id}`}>{field.label}</PreserveListPositionLink>
                      </div>
                      <span className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{dataTypeLabel(field.dataType)}</span>
                      <span className="truncate text-sm font-semibold text-slate-700">{field.unit || "—"}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600"><span className={`rounded-full px-2.5 py-1 font-bold ${field.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{field.active ? "Active" : "Inactive"}</span><span>ใช้งาน {field.valuesCount} ค่า</span></span>
                    </div>
                  </div>;
                })}
              </div> : null}
            </section>;
          })}
          {!types.length ? <div className="min-w-[900px] px-6 py-16 text-center text-slate-500"><CircuitBoard className="mx-auto" size={30}/><h2 className="mt-3 font-black text-slate-900">ยังไม่มี Asset Type</h2></div> : null}
        </div>
      </div>
    </section>
  );
}

function dataTypeLabel(value: string) {
  if (value === "NUMBER") return "ตัวเลข";
  if (value === "DATE") return "วันที่";
  if (value === "SELECT" || value === "BOOLEAN") return "ตัวเลือกกำหนดเอง";
  return "ข้อความ";
}

const toolbarButton = "flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600";
