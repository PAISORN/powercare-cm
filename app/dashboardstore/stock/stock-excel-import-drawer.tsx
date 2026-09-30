import { Download, FileSpreadsheet, X } from "lucide-react";
import Link from "next/link";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockPageData } from "../../../modules/store/stock-page-data";
import { importSparePartsExcelAction } from "./actions";
import { primaryButtonClass } from "./stock-drawer-styles";
import type { StockPageQuery } from "./types";

export function StockExcelImportDrawer({
  categories,
  currentPage,
  query,
  scope,
  sparePartTypes,
  stockPageHref,
  stores,
}: {
  categories: StockPageData["categories"];
  currentPage: number;
  query: StockPageQuery;
  scope: AdminSiteScope;
  sparePartTypes: StockPageData["sparePartTypes"];
  stockPageHref: (page: number) => string;
  stores: StockPageData["stores"];
}) {
  return (
<>
            <Link
              aria-label="ปิดหน้าต่างนำเข้า Excel"
              className="fixed inset-0 z-[75] bg-black/35 backdrop-blur-sm"
              href={stockPageHref(currentPage)}
              scroll={false}
            />
            <aside
              className="fixed inset-y-0 right-0 z-[80] w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7"
              id="excel-import-drawer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <FileSpreadsheet size={23} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--primary)]">
                      Excel Import
                    </p>
                    <h2 className="text-2xl font-extrabold">
                      นำเข้ารายการอะไหล่
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {scope.organization.name} · {scope.plant.name}
                    </p>
                  </div>
                </div>
                <Link
                  aria-label="ปิด"
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] transition hover:bg-[var(--line)]"
                  href={stockPageHref(currentPage)}
                >
                  <X size={19} />
                </Link>
              </div>

              {query.importError ? (
                <p
                  className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300"
                  role="alert"
                >
                  {query.importError}
                </p>
              ) : null}

              <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
                <h3 className="font-extrabold">1. ดาวน์โหลดไฟล์แม่แบบ</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  กรอกเฉพาะ Sheet Spare_Parts_Import ห้ามแก้ชื่อ Sheet
                  หรือหัวคอลัมน์
                </p>
                <a
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] transition hover:-translate-y-0.5"
                  download
                  href="/templates/spare-parts-import-template.xlsx"
                >
                  <Download size={17} />
                  ดาวน์โหลด Excel Template
                </a>
              </section>

              <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <h3 className="font-extrabold">2. รหัสที่ใช้ได้ใน Site นี้</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  ใช้รหัสตามรายการนี้เท่านั้น ระบบไม่รับชื่อแทนรหัส
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ReferenceCodeList
                    emptyText="ยังไม่มีคลังอะไหล่"
                    items={stores.map((store) => ({
                      code: store.code,
                      name: store.name,
                    }))}
                    title="คลังอะไหล่"
                  />
                  <ReferenceCodeList
                    emptyText="ยังไม่มีประเภท"
                    items={sparePartTypes.map((type) => ({
                      code: type.code,
                      name: type.name,
                    }))}
                    title="ประเภท"
                  />
                  <ReferenceCodeList
                    emptyText="ยังไม่มีหมวดหมู่"
                    items={categories.flatMap((category) =>
                      category.code
                        ? [{ code: category.code, name: category.name }]
                        : [],
                    )}
                    title="หมวดหมู่"
                  />
                </div>
              </section>

              <form
                action={importSparePartsExcelAction}
                className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <AdminScopeHiddenFields scope={scope} />
                <input
                  name="returnTo"
                  type="hidden"
                  value={stockPageHref(currentPage)}
                />
                <h3 className="font-extrabold">3. เลือกไฟล์และนำเข้า</h3>
                <label className="mt-3 grid gap-2 text-sm font-bold">
                  ไฟล์ Excel (.xlsx หรือ .xls ไม่เกิน 5 MB)
                  <input
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="block w-full rounded-xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2 file:font-bold file:text-white"
                    name="excelFile"
                    required
                    type="file"
                  />
                </label>
                <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  ระบบตรวจทุกแถวก่อนบันทึก หากพบข้อผิดพลาดจะไม่เพิ่มข้อมูลใด
                  ยอดตั้งต้นจะถูกบันทึกเป็นประวัติปรับยอดอัตโนมัติ
                </div>
                <button
                  className={`${primaryButtonClass} mt-4 w-full`}
                  type="submit"
                >
                  ตรวจสอบและนำเข้ารายการอะไหล่
                </button>
              </form>
            </aside>
          </>
  );
}

function ReferenceCodeList({ emptyText, items, title }: { emptyText: string; items: Array<{ code: string; name: string }>; title: string }) {
  return <div className="min-w-0 rounded-xl bg-[var(--soft)] p-3"><p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">{title}</p><div className="mt-2 grid max-h-40 gap-1.5 overflow-y-auto">{items.length ? items.map((item) => <p className="min-w-0 text-xs" key={item.code}><span className="font-mono font-extrabold text-[var(--primary)]">{item.code}</span><span className="ml-1 text-[var(--muted)]">{item.name}</span></p>) : <p className="text-xs text-[var(--muted)]">{emptyText}</p>}</div></div>;
}
