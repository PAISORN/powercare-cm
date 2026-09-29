import Link from "next/link";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { SparePartClassificationFields } from "../../../components/store/spare-part-classification-fields";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockPageData } from "../../../modules/store/stock-page-data";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";
import { updateSparePartFromStockAction } from "./actions";
import { inputClass, labelClass, primaryButtonClass } from "./stock-drawer-styles";

export function StockEditDrawer({
  canEditValue,
  currentPage,
  editPart,
  categories,
  materialGroups,
  scope,
  sparePartTypes,
  stockPageHref,
  stores,
  user,
}: {
  canEditValue: boolean;
  currentPage: number;
  editPart: StockBalanceRow["sparePart"];
  categories: StockPageData["categories"];
  materialGroups: StockPageData["materialGroups"];
  scope: AdminSiteScope;
  sparePartTypes: StockPageData["sparePartTypes"];
  stockPageHref: (page: number) => string;
  stores: StockPageData["stores"];
  user: { role: string };
}) {
  return (
<aside
            className="stock-right-sidebar fixed bottom-0 right-0 z-[80] w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
            id="edit-spare-part"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">
                  Edit Spare Part
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {editPart.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {editPart.code}
                </p>
              </div>
              <Link
                className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold"
                href={`${stockPageHref(currentPage)}#stock-row-${editPart.id}`}
                scroll={false}
              >
                ปิด
              </Link>
            </div>
            <form
              action={updateSparePartFromStockAction}
              className="mt-5 grid gap-4"
            >
              <AdminScopeHiddenFields scope={scope} />
              <input name="sparePartId" type="hidden" value={editPart.id} />
              <input
                name="returnTo"
                type="hidden"
                value={`${stockPageHref(currentPage)}#stock-row-${editPart.id}`}
              />
              <label className={labelClass}>
                ชนิดรายการ
                <select
                  aria-disabled={user.role !== "ADMIN"}
                  className={`${inputClass} ${user.role === "ADMIN" ? "" : "pointer-events-none bg-[var(--soft)] text-[var(--muted)]"}`}
                  defaultValue={editPart.itemKind}
                  name="itemKind"
                  required
                  tabIndex={user.role === "ADMIN" ? 0 : -1}
                >
                  <option value="SPARE_PART">อะไหล่</option>
                  <option value="CHEMICAL">สารเคมี</option>
                  <option value="OIL">น้ำมัน</option>
                </select>
              </label>
              <label className={labelClass}>
                ชื่ออะไหล่
                <input
                  className={inputClass}
                  defaultValue={editPart.name}
                  name="name"
                  required
                />
              </label>
              <label className={labelClass}>
                Item code
                <input
                  className={inputClass}
                  defaultValue={editPart.itemCode ?? ""}
                  maxLength={20}
                  name="itemCode"
                  required
                />
              </label>
              <label className={labelClass}>
                คลังอะไหล่
                <select
                  className={inputClass}
                  defaultValue={editPart.defaultStoreId ?? ""}
                  name="defaultStoreId"
                  required
                >
                  <option value="" disabled>
                    เลือกคลังอะไหล่
                  </option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} · {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                ประเภทอะไหล่ / ค่าใช้จ่าย
                <select
                  className={inputClass}
                  defaultValue={editPart.typeId ?? ""}
                  name="typeId"
                  required
                >
                  <option value="" disabled>
                    เลือกประเภท
                  </option>
                  {sparePartTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.code} · {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <SparePartClassificationFields
                categories={categories}
                className={inputClass}
                defaultCategoryId={editPart.categoryId ?? ""}
                defaultMaterialGroupId={editPart.materialGroupId ?? ""}
                groups={materialGroups}
                key={editPart.id}
              />
              <label className={labelClass}>
                หน่วยนับ
                <input
                  className={inputClass}
                  defaultValue={editPart.unit}
                  name="unit"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass}>
                  Min
                  <input
                    className={inputClass}
                    defaultValue={Number(editPart.minStock)}
                    min="0"
                    name="minStock"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className={labelClass}>
                  Max
                  <input
                    className={inputClass}
                    defaultValue={
                      editPart.maxStock == null ? "" : Number(editPart.maxStock)
                    }
                    min="0"
                    name="maxStock"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className={labelClass}>
                  Reorder Point
                  <input
                    className={inputClass}
                    defaultValue={Number(editPart.reorderPoint)}
                    min="0"
                    name="reorderPoint"
                    step="0.01"
                    type="number"
                    required
                  />
                </label>
              </div>
              <label className={labelClass}>
                ราคาล่าสุด
                <input
                  className={`${inputClass} ${canEditValue ? "" : "cursor-not-allowed bg-[var(--soft)] text-[var(--muted)]"}`}
                  defaultValue={
                    editPart.latestUnitPrice == null
                      ? ""
                      : Number(editPart.latestUnitPrice)
                  }
                  disabled={!canEditValue}
                  min="0"
                  name="latestUnitPrice"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className={labelClass}>
                รายละเอียด
                <textarea
                  className={`${inputClass} min-h-24 py-3`}
                  defaultValue={editPart.description ?? ""}
                  name="description"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                <label className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold">
                  <input
                    className="size-4 accent-[var(--primary)]"
                    defaultChecked={editPart.active}
                    name="active"
                    type="checkbox"
                  />
                  เปิดใช้งาน
                </label>
                <button className={primaryButtonClass}>บันทึกอะไหล่</button>
              </div>
            </form>
          </aside>
  );
}
