"use client";

import { useMemo, useState } from "react";

type Props = { initialDataType?: string; initialOptions?: string[] };

export default function TechnicalFieldConfig({ initialDataType = "TEXT", initialOptions = [] }: Props) {
  const [dataType, setDataType] = useState(initialDataType);
  const [options, setOptions] = useState(() => {
    const values = initialOptions.map((value) => value.trim()).filter(Boolean);
    return values.length ? values : [""];
  });
  const optionValue = useMemo(() => JSON.stringify(options.map((value) => value.trim()).filter(Boolean)), [options]);

  return (
    <>
      <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" name="dataType" value={dataType} onChange={(event) => setDataType(event.target.value)}>
        <option value="TEXT">ข้อความ</option>
        <option value="NUMBER">ตัวเลข</option>
        <option value="DATE">วันที่</option>
        <option value="BOOLEAN">ใช่ / ไม่ใช่</option>
        <option value="SELECT">ตัวเลือกกำหนดเอง</option>
      </select>
      {dataType === "SELECT" ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white/60 p-3">
          <input type="hidden" name="options" value={optionValue} />
          {options.map((option, index) => (
            <div className="flex items-center gap-2" key={`technical-option-${index}`}>
              <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" value={option} onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`ตัวเลือกที่ ${index + 1}`} aria-label={`ตัวเลือกที่ ${index + 1}`} />
              <button type="button" onClick={() => setOptions((current) => { const next = current.filter((_, itemIndex) => itemIndex !== index); return next.length ? next : [""]; })} className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">ลบ</button>
            </div>
          ))}
          <button type="button" onClick={() => setOptions((current) => [...current, ""])} className="rounded-xl border border-dashed border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">+ เพิ่มรายการ</button>
        </div>
      ) : null}
    </>
  );
}
