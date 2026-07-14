"use client";

import { Minus, PackagePlus, Plus } from "lucide-react";
import { useState } from "react";

type StoreOption = { id: string; name: string; code: string };
type SparePartOption = { id: string; name: string; code: string; unit: string };

type ReceiveStockFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  stores: StoreOption[];
  spareParts: SparePartOption[];
};

export function ReceiveStockForm({
  action,
  organizationId,
  plantId,
  stores,
  spareParts,
}: ReceiveStockFormProps) {
  const [lineIds, setLineIds] = useState([1]);
  const canSubmit = stores.length > 0 && spareParts.length > 0;

  function addLine() {
    setLineIds((current) => [...current, Math.max(...current) + 1]);
  }

  function removeLine(id: number) {
    setLineIds((current) => (current.length === 1 ? current : current.filter((lineId) => lineId !== id)));
  }

  return (
    <form action={action} className="space-y-5">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className={labelClass}>
          วันที่รับเข้า
          <input
            className={inputClass}
            defaultValue={toLocalDateTimeInput(new Date())}
            name="receivedAt"
            required
            type="datetime-local"
          />
        </label>
        <label className={labelClass}>
          เลขที่เอกสารอ้างอิง
          <input className={inputClass} name="referenceNo" />
        </label>
        <label className={labelClass}>
          ผู้ขาย / Supplier
          <input className={inputClass} name="supplierName" />
        </label>
        <label className={labelClass}>
          หมายเหตุ
          <input className={inputClass} name="note" />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold">รายการรับเข้า</h3>
            <p className="text-sm text-[var(--muted)]">เพิ่มหลายรายการได้ในเอกสารเดียว</p>
          </div>
          <button className={secondaryButtonClass} onClick={addLine} type="button">
            <Plus size={17} />
            เพิ่มรายการ
          </button>
        </div>

        {lineIds.map((lineId, index) => (
          <div
            key={lineId}
            className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 lg:grid-cols-[minmax(160px,0.8fr)_minmax(240px,1.5fr)_110px_140px_auto]"
          >
            <label className={labelClass}>
              คลัง
              <select className={inputClass} name="storeId" required defaultValue="">
                <option disabled value="">
                  เลือกคลัง
                </option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.code} · {store.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              อะไหล่
              <select className={inputClass} name="sparePartId" required defaultValue="">
                <option disabled value="">
                  เลือกอะไหล่
                </option>
                {spareParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.code} · {part.name} ({part.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              จำนวน
              <input className={inputClass} min="0.01" name="quantity" required step="0.01" type="number" />
            </label>
            <label className={labelClass}>
              ราคาต่อหน่วย
              <input className={inputClass} min="0" name="unitPrice" step="0.01" type="number" />
            </label>
            <button
              aria-label={`ลบรายการที่ ${index + 1}`}
              className="mt-auto flex size-12 items-center justify-center rounded-2xl border border-red-500/30 text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={lineIds.length === 1}
              onClick={() => removeLine(lineId)}
              title="ลบรายการ"
              type="button"
            >
              <Minus size={18} />
            </button>
          </div>
        ))}
      </div>

      {!canSubmit ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
          กรุณาสร้างคลังและข้อมูลอะไหล่ก่อนรับ Stock
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-lg backdrop-blur">
        <button
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--primary)] px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canSubmit}
        >
          <PackagePlus size={19} />
          บันทึกรับเข้า Stock
        </button>
      </div>
    </form>
  );
}

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]";
