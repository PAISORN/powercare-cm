import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockPageData } from "../../../modules/store/stock-page-data";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";
import {
  adjustStockAction,
  createOneIssueAction,
  receiveOneStockAction,
} from "./actions";
import { StockActionHiddenFields } from "./stock-action-hidden-fields";
import { inputClass, labelClass, primaryButtonClass } from "./stock-drawer-styles";

type StockActionFormProps = {
  currentPage: number;
  scope: AdminSiteScope;
  selectedStock: StockBalanceRow;
  stockPageHref: (page: number) => string;
};

export function StockIssueForm({
  currentPage,
  issueZones,
  scope,
  selectedStock,
  stockPageHref,
}: StockActionFormProps & { issueZones: StockPageData["issueZones"] }) {
  return (
    <form action={createOneIssueAction} className="mt-5 grid gap-4">
      <StockActionHiddenFields
        currentPage={currentPage}
        scope={scope}
        selectedStock={selectedStock}
        stockPageHref={stockPageHref}
      />
      <label className={labelClass}>
        Zone ที่นำอะไหล่ไปใช้งาน
        <select
          className={inputClass}
          disabled={!issueZones.length}
          name="zoneId"
          required
        >
          <option value="">
            {issueZones.length
              ? "เลือก Zone"
              : "Site นี้ยังไม่มี Applicable Zone ที่เปิดใช้งาน"}
          </option>
          {issueZones.map((assignment) => (
            <option key={assignment.zone.id} value={assignment.zone.id}>
              {assignment.code} · {assignment.zone.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        จำนวนที่ต้องการเบิก
        <input
          className={inputClass}
          inputMode="numeric"
          max={Math.floor(Number(selectedStock.quantity))}
          min="1"
          name="quantity"
          required
          step="1"
          type="number"
        />
      </label>
      <label className={labelClass}>
        หมายเหตุ
        <textarea
          className={`${inputClass} min-h-24 py-3`}
          name="note"
          placeholder="ระบุเหตุผลหรือรายละเอียดการเบิก"
        />
      </label>
      <button className={primaryButtonClass} disabled={!issueZones.length}>
        สร้างใบเบิก
      </button>
    </form>
  );
}

export function StockReceiveForm(props: StockActionFormProps) {
  return (
    <form action={receiveOneStockAction} className="mt-5 grid gap-4">
      <StockActionHiddenFields {...props} />
      <label className={labelClass}>
        จำนวนรับเข้า
        <input
          className={inputClass}
          min="0.01"
          name="quantity"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className={labelClass}>
        ราคาต่อหน่วย
        <input
          className={inputClass}
          min="0"
          name="unitPrice"
          step="0.01"
          type="number"
        />
      </label>
      <label className={labelClass}>
        Supplier
        <input className={inputClass} name="supplierName" />
      </label>
      <label className={labelClass}>
        Reference No.
        <input className={inputClass} name="referenceNo" />
      </label>
      <label className={labelClass}>
        หมายเหตุ
        <textarea className={`${inputClass} min-h-24 py-3`} name="note" />
      </label>
      <button className={primaryButtonClass}>รับเข้า Stock</button>
    </form>
  );
}

export function StockAdjustForm(props: StockActionFormProps) {
  return (
    <form action={adjustStockAction} className="mt-5 grid gap-4">
      <StockActionHiddenFields {...props} />
      <label className={labelClass}>
        จำนวนที่ปรับ (+/-)
        <input
          className={inputClass}
          name="quantityChange"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className={labelClass}>
        เหตุผล
        <input
          className={inputClass}
          name="reason"
          placeholder="เช่น ตรวจนับประจำเดือน"
          required
        />
      </label>
      <button className={primaryButtonClass}>บันทึกปรับยอด</button>
    </form>
  );
}
