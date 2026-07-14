import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BarChart3, Boxes, FileSpreadsheet } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import {
  summarizeStockBalances,
  summarizeStockMovements,
  summarizeStoreIssues,
} from "../../../modules/store/store-report-service";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  startDate?: string;
  endDate?: string;
};

export default async function StoreReportsPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  if (!canUseUserPermission(user, PermissionKey.VIEW_STORE_REPORTS)) redirect("/dashboard");

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const range = resolveDateRange(query);

  const [stocks, movements, issues] = await Promise.all([
    db.storeStock.findMany({
      where: { plantId: scope.plant.id },
      include: {
        store: { select: { name: true, code: true } },
        sparePart: {
          select: {
            code: true,
            itemCode: true,
            name: true,
            unit: true,
            minStock: true,
            latestUnitPrice: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
    }),
    db.stockMovement.findMany({
      where: {
        plantId: scope.plant.id,
        occurredAt: { gte: range.start, lte: range.end },
      },
      include: {
        store: { select: { code: true, name: true } },
        sparePart: { select: { code: true, name: true, unit: true } },
        actor: { select: { fullName: true } },
      },
      orderBy: { occurredAt: "desc" },
    }),
    db.sparePartIssue.findMany({
      where: {
        plantId: scope.plant.id,
        requestedAt: { gte: range.start, lte: range.end },
      },
      include: {
        items: {
          take: 1,
          include: { sparePart: { select: { category: { select: { name: true } } } } },
        },
      },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const stockSummary = summarizeStockBalances(
    stocks.map((stock) => ({
      id: stock.id,
      quantity: Number(stock.quantity),
      storeName: stock.store.name,
      sparePartCode: stock.sparePart.code,
      sparePartName: stock.sparePart.name,
      unit: stock.sparePart.unit,
      minStock: Number(stock.sparePart.minStock),
      latestUnitPrice: stock.sparePart.latestUnitPrice == null ? null : Number(stock.sparePart.latestUnitPrice),
      categoryName: stock.sparePart.category?.name ?? null,
    })),
  );
  const movementSummary = summarizeStockMovements(
    movements.map((movement) => ({
      movementType: movement.movementType,
      quantityChange: Number(movement.quantityChange),
      occurredAt: movement.occurredAt,
    })),
  );
  const issueSummary = summarizeStoreIssues(
    issues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      status: issue.status,
      requestedAt: issue.requestedAt,
      categoryName: issue.items[0]?.sparePart.category?.name ?? null,
    })),
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
            <FileSpreadsheet size={16} />
            Store Reports
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">รายงาน Store / Inventory</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                ดู Stock Balance, Low Stock, Receive / Issue และสถานะใบเบิกของ Site ที่เลือก
              </p>
            </div>
            <p className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-sm font-bold text-[var(--primary)]">
              {scope.plant.name}
            </p>
          </div>
        </section>

        <AdminSiteScopeSelector action="/inventory/reports" scope={scope} title="Site สำหรับรายงาน Store" />

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <form action="/inventory/reports" className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <AdminScopeHiddenFields scope={scope} />
            <label className={labelClass}>
              วันที่เริ่มต้น
              <input className={inputClass} defaultValue={range.startInput} name="startDate" type="date" />
            </label>
            <label className={labelClass}>
              วันที่สิ้นสุด
              <input className={inputClass} defaultValue={range.endInput} name="endDate" type="date" />
            </label>
            <button className="min-h-12 rounded-xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]">
              ดูรายงาน
            </button>
          </form>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReportCard icon={<Boxes size={20} />} label="Stock Balance" value={`${formatQuantity(stockSummary.totalItems)} รายการ`} detail={`รวม ${formatQuantity(stockSummary.totalQuantity)} หน่วย`} />
          <ReportCard icon={<AlertTriangle size={20} />} label="Low Stock" value={`${formatQuantity(stockSummary.lowStockItems.length)} รายการ`} detail="ต่ำกว่าหรือเท่ากับ Minimum Stock" danger={stockSummary.lowStockItems.length > 0} />
          <ReportCard icon={<ArrowDownToLine size={20} />} label="Receive" value={formatQuantity(movementSummary.receivedQuantity)} detail="จำนวนรับเข้าในช่วงวันที่" />
          <ReportCard icon={<ArrowUpFromLine size={20} />} label="Issue" value={formatQuantity(movementSummary.issuedQuantity)} detail="จำนวนจ่ายออกในช่วงวันที่" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-[var(--primary)]" size={20} />
              <h2 className="text-xl font-extrabold">Stock Value by Category</h2>
            </div>
            <div className="mt-5 space-y-3">
              {stockSummary.byCategory.map((category) => (
                <div key={category.categoryName} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{category.categoryName}</p>
                    <p className="font-extrabold">{formatMoney(category.totalValue)}</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatQuantity(category.totalItems)} รายการ · {formatQuantity(category.totalQuantity)} หน่วย
                  </p>
                </div>
              ))}
              {!stockSummary.byCategory.length ? <EmptyText text="ยังไม่มี Stock ใน Site นี้" /> : null}
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              <h2 className="text-xl font-extrabold">Low Stock</h2>
            </div>
            <div className="mt-5 space-y-3">
              {stockSummary.lowStockItems.slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="font-mono text-sm font-bold text-[var(--primary)]">{item.sparePartCode}</p>
                  <p className="mt-1 font-extrabold">{item.sparePartName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {item.storeName} · คงเหลือ {formatQuantity(item.quantity)} {item.unit} / Min {formatQuantity(item.minStock)}
                  </p>
                </div>
              ))}
              {!stockSummary.lowStockItems.length ? <EmptyText text="ยังไม่มีรายการต่ำกว่า Minimum Stock" /> : null}
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="text-xl font-extrabold">Receive / Issue Movement</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2">เวลา</th>
                    <th className="px-3 py-2">ประเภท</th>
                    <th className="px-3 py-2">อะไหล่</th>
                    <th className="px-3 py-2">Store</th>
                    <th className="px-3 py-2 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 15).map((movement) => (
                    <tr key={movement.id} className="border-t border-[var(--line)]">
                      <td className="whitespace-nowrap px-3 py-3">{formatThaiMediumDateTime(movement.occurredAt)}</td>
                      <td className="px-3 py-3 font-bold">{movement.movementType}</td>
                      <td className="px-3 py-3">{movement.sparePart.code} · {movement.sparePart.name}</td>
                      <td className="px-3 py-3">{movement.store.code}</td>
                      <td className="px-3 py-3 text-right font-extrabold">{formatQuantity(Number(movement.quantityChange))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!movements.length ? <EmptyText text="ยังไม่มี Receive / Issue ในช่วงวันที่นี้" /> : null}
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="text-xl font-extrabold">Store Issue Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Total" value={issueSummary.total} />
              <MiniMetric label="รอ Engineer" value={issueSummary.waitingEngineerApproval} />
              <MiniMetric label="รอ Store จ่าย" value={issueSummary.waitingStoreIssue} />
              <MiniMetric label="จ่ายแล้ว" value={issueSummary.issued} />
            </div>
            <div className="mt-5 space-y-2">
              {issueSummary.byCategory.map((category) => (
                <div key={category.categoryName} className="flex items-center justify-between rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                  <span className="font-bold">{category.categoryName}</span>
                  <span>{category.total} ใบ</span>
                </div>
              ))}
              {!issueSummary.byCategory.length ? <EmptyText text="ยังไม่มีใบเบิกในช่วงวันที่นี้" /> : null}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}

function ReportCard({
  icon,
  label,
  value,
  detail,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
      <div className={`inline-flex rounded-xl p-2 ${danger ? "bg-red-500/10 text-red-600" : "bg-[var(--soft)] text-[var(--primary)]"}`}>{icon}</div>
      <p className="mt-3 text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${danger ? "text-red-600" : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{formatQuantity(value)}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">{text}</p>;
}

function resolveDateRange(query: PageQuery) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);
  const startInput = validDateInput(query.startDate) ?? toDateInput(defaultStart);
  const endInput = validDateInput(query.endDate) ?? toDateInput(now);
  const start = new Date(`${startInput}T00:00:00+07:00`);
  const end = new Date(`${endInput}T23:59:59+07:00`);
  return { start, end, startInput, endInput };
}

function validDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
