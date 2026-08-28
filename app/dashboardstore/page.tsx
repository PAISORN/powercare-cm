import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  ClipboardClock,
  PackageCheck,
  Store,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { StoreDashboardFilter } from "../../components/store-dashboard-filter";
import { StoreCategoryDonut, StoreIssueTrend, type StoreCategoryRow, type StoreTrendRow, type StoreTrendSeries } from "../../components/store-dashboard-charts";
import { db } from "../../lib/db";
import { bangkokDayWindow, getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { requireUser } from "../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../modules/auth/site-admin-permissions";
import { hasExplicitCmDateFilter, parseCmDateFilter, type CmDateFilterInput } from "../../modules/filters/cm-date-filter";
import { resolveStorePageScope } from "../../modules/store/store-page-scope";
import { StockMovementType, StoreIssueStatus } from "../../modules/store/store-types";

type DashboardSearch = CmDateFilterInput & { organizationId?: string; plantId?: string };

const urgentStatuses = [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED, StoreIssueStatus.NOT_ENOUGH_STOCK];
const issueStatusLabel: Record<string, string> = {
  [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่ายของ",
  [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
  [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่เพียงพอ",
};
const categoryColors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#94a3b8"];

export default async function StoreDashboardPage({ searchParams }: { searchParams: Promise<DashboardSearch> }) {
  const user = await requireUser();

  const params = await searchParams;
  const scope = await resolveStorePageScope(user, params);
  const canViewValue = true;
  const canViewStock = canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK);
  const canTrack = canUseUserPermission(user, PermissionKey.VIEW_STORE_TRACKING);
  const canReceive = canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  const canViewMovements = canViewStock || canUseUserPermission(user, PermissionKey.VIEW_STORE_REPORTS) || canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const activeDateFilter: CmDateFilterInput = hasExplicitCmDateFilter(params) ? params : currentYearDateFilter();
  const dateFilter = parseCmDateFilter(activeDateFilter);
  const movementDateWhere = dateFilter.start && dateFilter.endExclusive ? { gte: dateFilter.start, lt: dateFilter.endExclusive } : undefined;
  const chartAnchor = clampChartAnchor(new Date(), dateFilter.start, dateFilter.endExclusive);
  const chartPeriods = buildChartPeriods(chartAnchor);
  const chartDateWhere = { gte: chartPeriods.year.previous.start, lt: chartPeriods.year.current.endExclusive };

  const [activeStores, stocks, movements, recentMovements, urgentIssues, issuesInPeriod, chartIssues, receivesInPeriod] = await Promise.all([
    db.store.findMany({
      where: { plantId: scope.plant.id, active: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    db.storeStock.findMany({
      where: { plantId: scope.plant.id, store: { active: true }, sparePart: { active: true } },
      select: {
        id: true,
        quantity: true,
        store: { select: { id: true, code: true, name: true } },
        sparePart: { select: { code: true, name: true, unit: true, minStock: true, latestUnitPrice: true, itemKind: true, category: { select: { name: true } } } },
      },
    }),
    db.stockMovement.findMany({
      where: { plantId: scope.plant.id, ...(movementDateWhere ? { occurredAt: movementDateWhere } : {}) },
      orderBy: { occurredAt: "asc" },
      select: { id: true, movementType: true, quantityChange: true, unitPrice: true, occurredAt: true, sparePart: { select: { latestUnitPrice: true } } },
    }),
    db.stockMovement.findMany({
      where: { plantId: scope.plant.id },
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: { id: true, movementType: true, quantityChange: true, occurredAt: true, store: { select: { name: true } }, sparePart: { select: { name: true, unit: true } } },
    }),
    db.sparePartIssue.findMany({
      where: { plantId: scope.plant.id, status: { in: urgentStatuses } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, number: true, requesterName: true, status: true, updatedAt: true, items: { select: { sparePart: { select: { name: true } } }, take: 1 } },
    }),
    db.sparePartIssue.findMany({
      where: { plantId: scope.plant.id, ...(movementDateWhere ? { requestedAt: movementDateWhere } : {}) },
      select: { id: true, requestedAt: true, issuedAt: true, items: { select: { issuedQty: true, unitPrice: true, sparePart: { select: { latestUnitPrice: true } } } } },
    }),
    db.sparePartIssue.findMany({
      where: {
        plantId: scope.plant.id,
        OR: [
          { issuedAt: chartDateWhere },
          { issuedAt: null, requestedAt: chartDateWhere },
        ],
      },
      select: { id: true, requestedAt: true, issuedAt: true, items: { select: { issuedQty: true, unitPrice: true, sparePart: { select: { latestUnitPrice: true } } } } },
    }),
    db.sparePartReceive.count({ where: { plantId: scope.plant.id, ...(movementDateWhere ? { receivedAt: movementDateWhere } : {}) } }),
  ]);

  const totalQuantity = stocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
  const totalValue = stocks.reduce((sum, stock) => sum + Number(stock.quantity) * Number(stock.sparePart.latestUnitPrice ?? 0), 0);
  const atRiskStocks = stocks
    .filter((stock) => Number(stock.quantity) <= Number(stock.sparePart.minStock))
    .sort((a, b) => Number(a.quantity) - Number(b.quantity));
  const lowStockRows = atRiskStocks.slice(0, 5);
  const issueValue = issuesInPeriod.reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + Number(item.issuedQty ?? 0) * Number(item.unitPrice ?? 0), 0), 0);
  const issuedMovements = movements.filter((movement) => movement.movementType === StockMovementType.ISSUE).length;
  const categoryRows = buildCategoryRows(stocks, canViewValue);
  const categoryTotal = categoryRows.reduce((sum, row) => sum + row.value, 0);
  const trendSeries = buildIssueTrendSeries(chartIssues, chartPeriods, canViewValue);
  const warehouseRows = buildWarehouseRows(activeStores, stocks, canViewValue);
  const periodLabel = formatPeriod(dateFilter.start, dateFilter.endExclusive);

  return (
    <AppShell>
      <main className="dashboard-glass-scope w-full min-w-0 space-y-5 pb-4">
        <header className="menu-heading-plain px-1 py-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-extrabold"><Store aria-hidden="true" size={18} /> PowerCare Store</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">สวัสดี, {user.fullName}</h1>
              <p className="mt-1 text-sm">ภาพรวมการบริหารจัดการคลังสินค้า · {scope.plant.name}</p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90">ข้อมูลรายการ: {periodLabel}</span>
          </div>
        </header>

        {(scope.canSelectOrganization || scope.canSelectPlant) ? <div className="dashboard-glass-host"><AdminSiteScopeSelector action="/dashboardstore" scope={scope} title="ขอบเขตคลังสินค้า" description="เลือก Organization และ Site ที่ต้องการดู Dashboard" /></div> : null}
        <StoreDashboardFilter activeDateFilter={activeDateFilter} organizationId={scope.organization.id} plantId={scope.plant.id} />

        <section aria-label="สรุปข้อมูลคลังสินค้า" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <MetricCard detail={canViewValue ? `${formatNumber(stocks.length)} รายการสินค้า` : `${formatNumber(totalQuantity)} หน่วยคงเหลือ`} href={canViewStock ? "/dashboardstore/stock" : undefined} icon={<Boxes size={21} />} label={canViewValue ? "มูลค่าสินค้าคงคลัง" : "รายการสินค้าคงคลัง"} tone="blue" value={canViewValue ? formatMoney(totalValue) : `${formatNumber(stocks.length)} รายการ`} />
          <MetricCard detail={periodLabel} href={canReceive ? "/dashboardstore/receive" : undefined} icon={<ArrowDownToLine size={21} />} label="รายการรับเข้า" tone="emerald" value={`${formatNumber(receivesInPeriod)} รายการ`} />
          <MetricCard detail={`${formatNumber(issuedMovements)} รายการเคลื่อนไหว`} href={canTrack ? "/dashboardstore/tracking" : undefined} icon={<ArrowUpFromLine size={21} />} label="รายการเบิกจ่าย" tone="violet" value={`${formatNumber(issuesInPeriod.length)} รายการ`} />
          <MetricCard detail={`${formatNumber(atRiskStocks.filter((stock) => Number(stock.quantity) <= 0).length)} รายการหมด Stock`} href={canViewStock ? "/dashboardstore/stock?stockStatus=nearMin" : undefined} icon={<AlertTriangle size={21} />} label="สินค้าใกล้หมด Stock" tone="amber" value={`${formatNumber(atRiskStocks.length)} รายการ`} />
          <MetricCard detail={canViewValue ? periodLabel : "รอ Store ดำเนินการ"} href={canTrack ? "/dashboardstore/tracking" : undefined} icon={<TrendingUp size={21} />} label={canViewValue ? "มูลค่าการเบิกจ่าย" : "ใบเบิกเร่งด่วน"} tone="rose" value={canViewValue ? formatMoney(issueValue) : `${formatNumber(urgentIssues.length)} รายการ`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.95fr)]">
          <DashboardPanel eyebrow="แนวโน้มการเบิกจ่าย" title={canViewValue ? "มูลค่าการเบิกจ่ายสินค้า" : "จำนวนการเบิกจ่ายสินค้า"}>
            <StoreIssueTrend initialBucket="threeMonths" series={trendSeries} showValue={canViewValue} />
          </DashboardPanel>
          <DashboardPanel eyebrow="โครงสร้าง Stock" title={canViewValue ? "มูลค่าคงคลังแยกตามประเภท" : "จำนวนคงเหลือแยกตามประเภท"}>
            <StoreCategoryDonut rows={categoryRows} showValue={canViewValue} total={categoryTotal} />
          </DashboardPanel>
        </section>

        <section className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1.15fr)]">
          <DashboardPanel action={canViewStock ? { href: "/dashboardstore/stock?stockStatus=nearMin", label: "ดูทั้งหมด" } : undefined} eyebrow="ต้องดำเนินการ" title="สินค้าใกล้หมด Stock">
            <div className="divide-y divide-[var(--line)]">
              {lowStockRows.length ? lowStockRows.map((stock) => <LowStockRow key={stock.id} stock={stock} />) : <EmptyState icon={<CheckCircle2 size={22} />} text="Stock ทุกประเภทอยู่ในระดับปกติ" />}
            </div>
          </DashboardPanel>

          <DashboardPanel action={canViewMovements ? { href: "/dashboardstore/movements", label: "ดูทั้งหมด" } : undefined} eyebrow="กิจกรรมล่าสุด" title="ความเคลื่อนไหวล่าสุด">
            <div className="divide-y divide-[var(--line)]">
              {recentMovements.length ? recentMovements.map((movement) => <MovementRow canNavigate={canViewMovements} key={movement.id} movement={movement} />) : <EmptyState icon={<ClipboardClock size={22} />} text="ยังไม่มีความเคลื่อนไหวในคลัง" />}
            </div>
          </DashboardPanel>

          <DashboardPanel action={canTrack ? { href: "/dashboardstore/tracking", label: "ดูใบเบิก" } : undefined} eyebrow="คิวงาน Store" title="ใบเบิกที่ต้องติดตาม">
            <div className="divide-y divide-[var(--line)]">
              {urgentIssues.length ? urgentIssues.map((issue) => <Link className="flex cursor-pointer items-center gap-3 py-3 transition hover:bg-[var(--soft)]" href="/dashboardstore/tracking" key={issue.id}><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${issue.status === StoreIssueStatus.NOT_ENOUGH_STOCK ? "bg-red-500/12 text-red-600" : "bg-violet-500/12 text-violet-600"}`}><ClipboardClock size={19} /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{issue.number}</b><small className="block truncate text-xs text-[var(--muted)]">{issue.items[0]?.sparePart.name ?? issue.requesterName}</small></span><span className="text-right text-xs"><b className={issue.status === StoreIssueStatus.NOT_ENOUGH_STOCK ? "text-red-600" : "text-violet-600"}>{issueStatusLabel[issue.status] ?? issue.status}</b><small className="mt-1 block text-[var(--muted)]">{formatDateTime(issue.updatedAt)}</small></span></Link>) : <EmptyState icon={<CheckCircle2 size={22} />} text="ไม่มีใบเบิกค้างดำเนินการ" />}
            </div>
          </DashboardPanel>
        </section>

        <DashboardPanel action={canViewStock ? { href: "/dashboardstore/stock", label: "ดูรายงาน Stock" } : undefined} eyebrow="ภาพรวมสถานที่จัดเก็บ" title="สรุปตามคลังสินค้า">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-[var(--line)] bg-[var(--soft)] text-xs text-[var(--muted)]"><th className="rounded-l-xl px-4 py-3">คลังสินค้า</th><th className="px-4 py-3 text-right">{canViewValue ? "มูลค่าคงคลัง" : "จำนวนคงเหลือ"}</th><th className="px-4 py-3 text-right">รายการสินค้า</th><th className="rounded-r-xl px-4 py-3 text-center">สถานะ</th></tr></thead>
              <tbody>{warehouseRows.map((row) => <tr className="border-b border-[var(--line)] last:border-0" key={row.id}><td className="px-4 py-3"><b>{row.code}</b><span className="ml-2 text-[var(--muted)]">{row.name}</span></td><td className="px-4 py-3 text-right font-extrabold">{canViewValue ? formatMoney(row.measure) : formatNumber(row.measure)}</td><td className="px-4 py-3 text-right">{formatNumber(row.items)}</td><td className="px-4 py-3 text-center"><span className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-extrabold ${row.alerts ? "bg-amber-500/12 text-amber-700" : "bg-emerald-500/12 text-emerald-700"}`}>{row.alerts ? `ตรวจสอบ ${row.alerts}` : "ปกติ"}</span></td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-2">
            <SummaryStat icon={<Warehouse size={20} />} label="คลังสินค้าที่ใช้งาน" value={`${formatNumber(warehouseRows.length)} คลัง`} />
            <SummaryStat icon={<PackageCheck size={20} />} label="รายการสินค้าทั้งหมด" value={`${formatNumber(stocks.length)} รายการ`} />
          </div>
        </DashboardPanel>
      </main>
    </AppShell>
  );
}

function MetricCard({ detail, href, icon, label, tone, value }: { detail: string; href?: string; icon: React.ReactNode; label: string; tone: "blue" | "emerald" | "violet" | "amber" | "rose"; value: string }) {
  const tones = { blue: "#2563eb", emerald: "#10b981", violet: "#8b5cf6", amber: "#f59e0b", rose: "#ef4444" };
  const content = <>
    <div className="relative z-10 flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight text-[var(--muted)] sm:text-sm">{label}</span>
        <strong className="mt-2 block truncate text-2xl font-black leading-none tracking-tight sm:text-3xl">{value}</strong>
      </span>
      <span className="dashboard-kpi-icon shrink-0 [&>svg]:size-8 sm:[&>svg]:size-9">{icon}</span>
    </div>
    <small className="relative z-10 mt-4 block truncate text-xs font-semibold leading-snug text-[var(--muted)] sm:text-sm">{detail}</small>
  </>;
  const className = "dashboard-kpi relative block min-h-[148px] h-full w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] p-4 text-left text-[var(--ink)] shadow-[var(--shadow)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] sm:p-5";
  const style = { "--kpi-color": tones[tone] } as React.CSSProperties;
  return href ? <Link aria-label={`${label} ${value}`} className={`${className} cursor-pointer`} href={href} style={style}>{content}</Link> : <article className={className} style={style}>{content}</article>;
}

function DashboardPanel({ action, children, eyebrow, title }: { action?: { href: string; label: string }; children: React.ReactNode; eyebrow: string; title: string }) {
  return <section className="dashboard-panel min-w-0 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--primary)]">{eyebrow}</p><h2 className="mt-1 text-lg font-black sm:text-xl">{title}</h2></div>{action ? <Link className="inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap text-sm font-extrabold text-[var(--primary)] hover:underline" href={action.href}>{action.label}<ArrowRight size={15} /></Link> : null}</div>{children}</section>;
}

function LowStockRow({ stock }: { stock: { id: string; quantity: { toString(): string }; store: { name: string }; sparePart: { code: string; name: string; unit: string; minStock: { toString(): string } } } }) {
  const quantity = Number(stock.quantity);
  const empty = quantity <= 0;
  return <div className="flex items-center gap-3 py-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${empty ? "bg-red-500/12 text-red-600" : "bg-amber-500/12 text-amber-600"}`}><AlertTriangle size={18} /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{stock.sparePart.name}</b><small className="block truncate text-xs text-[var(--muted)]">{stock.sparePart.code} · {stock.store.name}</small></span><span className="text-right"><b className={empty ? "text-red-600" : "text-amber-600"}>{formatNumber(quantity)} {stock.sparePart.unit}</b><small className="block text-xs text-[var(--muted)]">จุดสั่งซื้อ {formatNumber(Number(stock.sparePart.minStock))}</small></span></div>;
}

function MovementRow({ canNavigate, movement }: { canNavigate: boolean; movement: { id: string; movementType: string; quantityChange: { toString(): string; gt(value: number): boolean }; occurredAt: Date; store: { name: string }; sparePart: { name: string; unit: string } } }) {
  const incoming = movement.quantityChange.gt(0);
  const content = <><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${incoming ? "bg-emerald-500/12 text-emerald-600" : "bg-violet-500/12 text-violet-600"}`}>{incoming ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{movement.sparePart.name}</b><small className="block truncate text-xs text-[var(--muted)]">{movement.store.name} · {movementLabel(movement.movementType)}</small></span><span className="text-right"><b className={incoming ? "text-emerald-600" : "text-violet-600"}>{incoming ? "+" : ""}{formatNumber(Number(movement.quantityChange))} {movement.sparePart.unit}</b><small className="block text-xs text-[var(--muted)]">{formatDateTime(movement.occurredAt)}</small></span></>;
  const className = "flex items-center gap-3 py-3 transition hover:bg-[var(--soft)]";
  return canNavigate ? <Link className={`${className} cursor-pointer`} href="/dashboardstore/movements">{content}</Link> : <div className={className}>{content}</div>;
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">{icon}</span><span><small className="block font-semibold text-[var(--muted)]">{label}</small><b className="text-lg font-black">{value}</b></span></div>; }
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm font-semibold text-[var(--muted)]"><span className="text-[var(--primary)]">{icon}</span>{text}</div>; }

function buildCategoryRows(stocks: Array<{ quantity: { toString(): string }; sparePart: { latestUnitPrice: { toString(): string } | null; itemKind: string; category: { name: string } | null } }>, showValue: boolean): StoreCategoryRow[] {
  const grouped = new Map<string, number>();
  for (const stock of stocks) {
    const label = stock.sparePart.category?.name ?? itemKindLabel(stock.sparePart.itemKind);
    const quantity = Math.max(0, Number(stock.quantity));
    const value = showValue ? quantity * Number(stock.sparePart.latestUnitPrice ?? 0) : quantity;
    grouped.set(label, (grouped.get(label) ?? 0) + value);
  }
  const sorted = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  const primary = sorted.slice(0, 4);
  const otherValue = sorted.slice(4).reduce((sum, [, value]) => sum + value, 0);
  const rows = otherValue > 0 ? [...primary, ["อื่น ๆ", otherValue] as [string, number]] : primary;
  return rows.filter(([, value]) => value > 0).map(([label, value], index) => ({ label, value, detail: showValue ? formatMoney(value) : `${formatNumber(value)} หน่วย`, color: categoryColors[index] }));
}

type TrendMode = "threeMonths" | "day" | "week" | "month" | "year";
type TrendRange = { start: Date; endExclusive: Date };
type TrendPeriods = Record<TrendMode, { current: TrendRange; previous: TrendRange }>;
type TrendIssue = {
  requestedAt: Date;
  issuedAt: Date | null;
  items: Array<{
    issuedQty: { toString(): string } | null;
    unitPrice: { toString(): string } | null;
    sparePart: { latestUnitPrice: { toString(): string } | null };
  }>;
};

function buildIssueTrendSeries(issues: TrendIssue[], periods: TrendPeriods, showValue: boolean): StoreTrendSeries {
  return {
    threeMonths: buildIssueTrendRows(issues, periods.threeMonths, "threeMonths", showValue),
    day: buildIssueTrendRows(issues, periods.day, "day", showValue),
    week: buildIssueTrendRows(issues, periods.week, "week", showValue),
    month: buildIssueTrendRows(issues, periods.month, "month", showValue),
    year: buildIssueTrendRows(issues, periods.year, "year", showValue),
  };
}

function buildIssueTrendRows(issues: TrendIssue[], periods: { current: TrendRange; previous: TrendRange }, mode: TrendMode, showValue: boolean): StoreTrendRow[] {
  const currentBuckets = splitTrendRange(periods.current, mode);
  const previousBuckets = splitTrendRange(periods.previous, mode, currentBuckets.length);
  return currentBuckets.map((range, index) => ({
    label: formatTrendAxisLabel(range, mode),
    tooltipLabel: formatTrendTooltipLabel(range, mode),
    issued: sumIssueMeasure(issues, range, showValue),
    previous: sumIssueMeasure(issues, previousBuckets[index], showValue),
    quantity: countIssuedRecords(issues, range),
  }));
}

function sumIssueMeasure(issues: TrendIssue[], range: TrendRange, showValue: boolean) {
  return issues.reduce((total, issue) => {
    const occurredAt = issue.issuedAt ?? issue.requestedAt;
    if (occurredAt < range.start || occurredAt >= range.endExclusive) return total;
    return total + issue.items.reduce((sum, item) => {
      const quantity = Number(item.issuedQty ?? 0);
      return sum + (showValue ? quantity * Number(item.unitPrice ?? item.sparePart.latestUnitPrice ?? 0) : quantity);
    }, 0);
  }, 0);
}

function countIssuedRecords(issues: TrendIssue[], range: TrendRange) {
  return issues.reduce((count, issue) => {
    const occurredAt = issue.issuedAt ?? issue.requestedAt;
    if (occurredAt < range.start || occurredAt >= range.endExclusive) return count;
    return issue.items.some((item) => Number(item.issuedQty ?? 0) > 0) ? count + 1 : count;
  }, 0);
}

function buildChartPeriods(anchor: Date): TrendPeriods {
  const anchorIso = getBangkokDateString(anchor);
  const [year, month] = anchorIso.split("-").map(Number);
  const weekday = new Date(`${anchorIso}T00:00:00.000Z`).getUTCDay();
  const weekStartIso = addIsoDays(anchorIso, -((weekday + 6) % 7));
  const monthStartIso = isoDate(year, month, 1);
  const nextMonthStartIso = month === 12 ? isoDate(year + 1, 1, 1) : isoDate(year, month + 1, 1);
  const previousMonthStartIso = month === 1 ? isoDate(year - 1, 12, 1) : isoDate(year, month - 1, 1);
  const threeMonthEndIso = addIsoDays(anchorIso, 1);
  const threeMonthStartIso = addIsoMonths(threeMonthEndIso, -3);
  return {
    threeMonths: { current: calendarRange(threeMonthStartIso, threeMonthEndIso), previous: calendarRange(addIsoMonths(threeMonthStartIso, -3), threeMonthStartIso) },
    day: { current: calendarRange(anchorIso, addIsoDays(anchorIso, 1)), previous: calendarRange(addIsoDays(anchorIso, -1), anchorIso) },
    week: { current: calendarRange(weekStartIso, addIsoDays(weekStartIso, 7)), previous: calendarRange(addIsoDays(weekStartIso, -7), weekStartIso) },
    month: { current: calendarRange(monthStartIso, nextMonthStartIso), previous: calendarRange(previousMonthStartIso, monthStartIso) },
    year: { current: calendarRange(isoDate(year, 1, 1), isoDate(year + 1, 1, 1)), previous: calendarRange(isoDate(year - 1, 1, 1), isoDate(year, 1, 1)) },
  };
}

function splitTrendRange(range: TrendRange, mode: TrendMode, requestedBucketCount?: number): TrendRange[] {
  if (mode === "day") {
    const duration = range.endExclusive.getTime() - range.start.getTime();
    const bucketCount = requestedBucketCount ?? 24;
    return Array.from({ length: bucketCount }, (_, index) => ({
      start: new Date(range.start.getTime() + Math.floor((duration * index) / bucketCount)),
      endExclusive: new Date(range.start.getTime() + Math.floor((duration * (index + 1)) / bucketCount)),
    }));
  }
  const startIso = getBangkokDateString(range.start);
  const endIso = getBangkokDateString(range.endExclusive);
  const dayCount = Math.round((Date.parse(`${endIso}T00:00:00.000Z`) - Date.parse(`${startIso}T00:00:00.000Z`)) / 86_400_000);
  const bucketCount = requestedBucketCount ?? (mode === "week" ? 7 : mode === "year" ? 52 : dayCount);
  return Array.from({ length: bucketCount }, (_, index) => calendarRange(
    addIsoDays(startIso, Math.floor((dayCount * index) / bucketCount)),
    addIsoDays(startIso, Math.floor((dayCount * (index + 1)) / bucketCount)),
  ));
}

function formatTrendAxisLabel(range: TrendRange, mode: TrendMode) {
  if (mode === "day") return formatTrendTime(range.start);
  if (mode === "week") return new Intl.DateTimeFormat("th-TH-u-nu-latn", { timeZone: "Asia/Bangkok", weekday: "short" }).format(range.start);
  const end = new Date(range.endExclusive.getTime() - 1);
  if (getBangkokDateString(range.start) === getBangkokDateString(end)) return formatTrendShortDate(range.start);
  if (mode === "month") return `${formatTrendDay(range.start)}–${formatTrendDay(end)}`;
  return `${formatTrendShortDate(range.start)}–${formatTrendShortDate(end)}`;
}

function formatTrendTooltipLabel(range: TrendRange, mode: TrendMode) {
  if (mode === "day") return `${formatTrendTime(range.start)}–${formatTrendTime(range.endExclusive)}`;
  const end = new Date(range.endExclusive.getTime() - 1);
  const formatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: mode === "year" || mode === "threeMonths" ? "numeric" : undefined });
  return `${formatter.format(range.start)}–${formatter.format(end)}`;
}

function calendarRange(startIso: string, endIso: string): TrendRange {
  return { start: bangkokDayWindow(startIso).start, endExclusive: bangkokDayWindow(endIso).start };
}
function addIsoDays(value: string, days: number) { const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function addIsoMonths(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const targetMonthIndex = year * 12 + month - 1 + months;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return isoDate(targetYear, targetMonth + 1, Math.min(day, lastDay));
}
function isoDate(year: number, month: number, day: number) { return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
function formatTrendTime(value: Date) { return new Intl.DateTimeFormat("th-TH-u-nu-latn", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(value); }
function formatTrendDay(value: Date) { return new Intl.DateTimeFormat("th-TH-u-nu-latn", { timeZone: "Asia/Bangkok", day: "numeric" }).format(value); }
function formatTrendShortDate(value: Date) { return new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(value); }

function buildWarehouseRows(stores: Array<{ id: string; code: string; name: string }>, stocks: Array<{ quantity: { toString(): string }; store: { id: string; code: string; name: string }; sparePart: { minStock: { toString(): string }; latestUnitPrice: { toString(): string } | null } }>, showValue: boolean) {
  const rows = new Map(stores.map((store) => [store.id, { ...store, measure: 0, items: 0, alerts: 0 }]));
  for (const stock of stocks) {
    const row = rows.get(stock.store.id) ?? { id: stock.store.id, code: stock.store.code, name: stock.store.name, measure: 0, items: 0, alerts: 0 };
    const quantity = Number(stock.quantity);
    row.measure += showValue ? quantity * Number(stock.sparePart.latestUnitPrice ?? 0) : quantity;
    row.items += 1;
    if (quantity <= Number(stock.sparePart.minStock)) row.alerts += 1;
    rows.set(row.id, row);
  }
  return [...rows.values()].sort((a, b) => b.measure - a.measure);
}

function movementLabel(value: string) { return value === StockMovementType.RECEIVE ? "รับสินค้าเข้า" : value === StockMovementType.ISSUE ? "เบิกจ่าย" : "ปรับยอด Stock"; }
function itemKindLabel(value: string) { return value === "CHEMICAL" ? "สารเคมี" : value === "OIL" ? "น้ำมัน" : value === "FUEL" ? "เชื้อเพลิง" : "อะไหล่ทั่วไป"; }
function currentYearDateFilter(now = new Date()): CmDateFilterInput {
  const year = new Intl.DateTimeFormat("en", { timeZone: "Asia/Bangkok", year: "numeric" }).format(now);
  return { mode: "year", year };
}
function clampChartAnchor(now: Date, start?: Date, endExclusive?: Date) {
  if (!start || !endExclusive) return now;
  if (now < start) return start;
  if (now >= endExclusive) return new Date(endExclusive.getTime() - 1);
  return now;
}
function formatPeriod(start?: Date, endExclusive?: Date) { if (!start || !endExclusive) return "ข้อมูลทั้งหมด"; const end = new Date(endExclusive.getTime() - 1); const formatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }); return `${formatter.format(start)} - ${formatter.format(end)}`; }
function formatDateTime(value: Date) { return new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(value); }
function formatNumber(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value); }
function formatMoney(value: number) { return `฿${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value)}`; }
