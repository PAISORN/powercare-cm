import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Beaker,
  Boxes,
  CheckCircle2,
  ClipboardClock,
  Droplets,
  Package,
  PackageCheck,
  PackagePlus,
  Store,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../modules/store/store-page-scope";
import { StoreIssueStatus } from "../../modules/store/store-types";

const issueStatusLabel: Record<string, string> = {
  [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
  [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับให้แก้ไข",
  [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่ายของ",
  [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
  [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่เพียงพอ",
  [StoreIssueStatus.ISSUED]: "จ่ายแล้ว",
  [StoreIssueStatus.ENGINEER_REJECTED]: "Engineer ไม่อนุมัติ",
  [StoreIssueStatus.STORE_REJECTED]: "Store ไม่อนุมัติ",
  [StoreIssueStatus.CANCELED]: "ยกเลิก",
};

export default async function InventoryPage() {
  const user = await requireUser();
  if (!canUseUserPermission(user, PermissionKey.VIEW_STORE_DASHBOARD)) redirect("/dashboardcm");

  const scope = await resolveStorePageScope(user);
  const canCreateIssue = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);
  const canReceive = canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  const canViewValue = canUseUserPermission(user, PermissionKey.VIEW_STOCK_VALUE);
  const canViewStock = canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK);
  const canTrack = canUseUserPermission(user, PermissionKey.VIEW_STORE_TRACKING);

  const [stocks, issues, movements] = await Promise.all([
    db.storeStock.findMany({
      where: { plantId: scope.plant.id, store: { active: true }, sparePart: { active: true } },
      select: {
        id: true,
        quantity: true,
        store: { select: { name: true } },
        sparePart: { select: { code: true, name: true, unit: true, minStock: true, latestUnitPrice: true } },
      },
    }),
    db.sparePartIssue.findMany({
      where: { plantId: scope.plant.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, number: true, requesterName: true, status: true, updatedAt: true, items: { select: { sparePart: { select: { name: true } } }, take: 2 } },
    }),
    db.stockMovement.findMany({
      where: { plantId: scope.plant.id },
      orderBy: { occurredAt: "desc" },
      take: 4,
      select: { id: true, movementType: true, quantityChange: true, occurredAt: true, sparePart: { select: { name: true, unit: true } } },
    }),
  ]);

  const totalQuantity = stocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
  const totalValue = stocks.reduce((sum, stock) => sum + Number(stock.quantity) * Number(stock.sparePart.latestUnitPrice ?? 0), 0);
  const outOfStock = stocks.filter((stock) => Number(stock.quantity) <= 0);
  const lowStock = stocks.filter((stock) => Number(stock.quantity) > 0 && Number(stock.quantity) <= Number(stock.sparePart.minStock));
  const urgentIssues = issues.filter((issue) => [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED, StoreIssueStatus.NOT_ENOUGH_STOCK].includes(issue.status as never));
  const lowStockRows = [...outOfStock, ...lowStock].slice(0, 5);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="menu-heading-plain px-1 py-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-extrabold text-white/80"><Store size={17} /> PowerCare Store</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Store Dashboard</h1>
              <p className="mt-1 text-sm text-white/75">ภาพรวมคลังอะไหล่และงานจ่ายของ · {scope.plant.name}</p>
            </div>
            <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90">อัปเดตจากข้อมูลล่าสุด</p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปข้อมูล Store">
          <MetricCard icon={<Boxes size={21} />} label="รายการในคลัง" value={formatNumber(stocks.length)} detail={`${formatNumber(totalQuantity)} หน่วยคงเหลือ`} tone="blue" />
          <MetricCard icon={<AlertTriangle size={21} />} label="ต้องตรวจสอบ Stock" value={formatNumber(lowStock.length + outOfStock.length)} detail={`${formatNumber(outOfStock.length)} รายการหมดสต็อก`} tone="amber" href="/dashboardstore/stock?stockStatus=nearMin" />
          <MetricCard icon={<ClipboardClock size={21} />} label="รอ Store ดำเนินการ" value={formatNumber(urgentIssues.length)} detail="ใบเบิกที่ต้องติดตาม" tone="violet" href="/dashboardstore/tracking" />
          <MetricCard icon={<PackageCheck size={21} />} label={canViewValue ? "มูลค่า Stock" : "Stock พร้อมใช้งาน"} value={canViewValue ? formatMoney(totalValue) : formatNumber(stocks.length - outOfStock.length)} detail={canViewValue ? "มูลค่าตามราคาล่าสุด" : "รายการที่ยังมีคงเหลือ"} tone="emerald" />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-bold text-[var(--primary)]">ต้องดำเนินการ</p><h2 className="text-xl font-black">รายการ Stock เสี่ยงขาด</h2></div>
              {canViewStock ? <Link className="text-sm font-extrabold text-[var(--primary)] hover:underline" href="/dashboardstore/stock">ดู Stock ทั้งหมด</Link> : null}
            </div>
            <div className="mt-4 divide-y divide-[var(--line)]">
              {lowStockRows.length ? lowStockRows.map((stock) => {
                const quantity = Number(stock.quantity);
                const isEmpty = quantity <= 0;
                return <div className="flex items-center gap-3 py-3" key={stock.id}>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${isEmpty ? "bg-red-500/12 text-red-600" : "bg-amber-500/12 text-amber-600"}`}><AlertTriangle size={19} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-extrabold">{stock.sparePart.name}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{stock.sparePart.code} · {stock.store.name}</p></div>
                  <div className="text-right"><p className={`font-black ${isEmpty ? "text-red-600" : "text-amber-600"}`}>{formatNumber(quantity)} {stock.sparePart.unit}</p><p className="text-xs text-[var(--muted)]">ขั้นต่ำ {formatNumber(Number(stock.sparePart.minStock))}</p></div>
                </div>;
              }) : <EmptyState icon={<CheckCircle2 size={22} />} text="Stock ทุกประเภทอยู่ในระดับปกติ" />}
            </div>
          </div>

          <aside className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
            <p className="text-sm font-bold text-[var(--primary)]">ทางลัด</p><h2 className="text-xl font-black">เริ่มงาน Store</h2>
            <div className="mt-4 grid gap-2">
              {canCreateIssue ? <QuickLink href="/dashboardstore/issue?itemKind=SPARE_PART" icon={<Package size={19} />} label="สร้างใบเบิกอะไหล่" detail="เบิกใช้งานหรืออ้างอิงงาน CM" /> : null}
              {canCreateIssue ? <QuickLink href="/dashboardstore/issue?itemKind=CHEMICAL" icon={<Beaker size={19} />} label="เบิกสารเคมี" detail="บันทึกการใช้งานและปริมาณ" /> : null}
              {canCreateIssue ? <QuickLink href="/dashboardstore/issue?itemKind=OIL" icon={<Droplets size={19} />} label="เบิกน้ำมัน" detail="บันทึกข้อมูลยานพาหนะหรือเครื่องจักร" /> : null}
              {canReceive ? <QuickLink href="/dashboardstore/receive" icon={<PackagePlus size={19} />} label="รับสินค้าเข้า" detail="บันทึกรายการรับเข้าคลัง" /> : null}
              {canTrack ? <QuickLink href="/dashboardstore/tracking" icon={<ClipboardClock size={19} />} label="ติดตามใบเบิก" detail="ตรวจสอบสถานะและการจ่ายของ" /> : null}
              {canViewStock ? <QuickLink href="/dashboardstore/stock" icon={<Warehouse size={19} />} label="จัดการ Stock" detail="ค้นหา ตรวจนับ และปรับยอด" /> : null}
            </div>
          </aside>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ActivityPanel title="ใบเบิกล่าสุด" href="/dashboardstore/tracking" items={issues.map((issue) => ({ id: issue.id, title: issue.number, detail: issue.items.map((item) => item.sparePart.name).join(", ") || issue.requesterName, meta: issueStatusLabel[issue.status] ?? issue.status, date: issue.updatedAt, danger: issue.status === StoreIssueStatus.NOT_ENOUGH_STOCK }))} empty="ยังไม่มีใบเบิกใน Site นี้" />
          <ActivityPanel title="ความเคลื่อนไหวล่าสุด" href="/dashboardstore/movements" items={movements.map((movement) => ({ id: movement.id, title: movement.sparePart.name, detail: movement.movementType === "RECEIVE" ? "รับสินค้าเข้าคลัง" : movement.movementType === "ISSUE" ? "จ่ายสินค้าออก" : "ปรับยอด Stock", meta: `${movement.quantityChange.gt(0) ? "+" : ""}${formatNumber(Number(movement.quantityChange))} ${movement.sparePart.unit}`, date: movement.occurredAt, positive: movement.quantityChange.gt(0) }))} empty="ยังไม่มีความเคลื่อนไหวในคลัง" />
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ icon, label, value, detail, tone, href }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "blue" | "amber" | "violet" | "emerald"; href?: string }) {
  const colors = { blue: "bg-blue-500/12 text-blue-700", amber: "bg-amber-500/12 text-amber-600", violet: "bg-violet-500/12 text-violet-700", emerald: "bg-emerald-500/12 text-emerald-700" };
  const content = <><span className={`grid size-11 place-items-center rounded-2xl ${colors[tone]}`}>{icon}</span><p className="mt-4 text-sm font-bold text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black tracking-tight">{value}</p><p className="mt-1 text-xs font-semibold text-[var(--muted)]">{detail}</p></>;
  const className = "block min-h-40 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/35 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";
  return href ? <Link className={className} href={href}>{content}</Link> : <article className={className}>{content}</article>;
}

function QuickLink({ href, icon, label, detail }: { href: string; icon: React.ReactNode; label: string; detail: string }) {
  return <Link className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3.5 py-3 transition duration-200 hover:bg-[var(--surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" href={href}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">{icon}</span><span className="min-w-0 flex-1"><b className="block text-sm">{label}</b><small className="block truncate text-xs text-[var(--muted)]">{detail}</small></span><ArrowUpRight className="shrink-0 text-[var(--muted)]" size={17} /></Link>;
}

function ActivityPanel({ title, href, items, empty }: { title: string; href: string; empty: string; items: Array<{ id: string; title: string; detail: string; meta: string; date: Date; danger?: boolean; positive?: boolean }> }) {
  return <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">{title}</h2><Link className="text-sm font-extrabold text-[var(--primary)] hover:underline" href={href}>ดูทั้งหมด</Link></div><div className="mt-3 divide-y divide-[var(--line)]">{items.length ? items.map((item) => <Link className="flex items-center gap-3 py-3 transition hover:bg-[var(--soft)]" href={href} key={item.id}><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.danger ? "bg-red-500/12 text-red-600" : item.positive ? "bg-emerald-500/12 text-emerald-600" : "bg-blue-500/12 text-blue-700"}`}>{item.positive ? <ArrowDownRight size={18} /> : <ClipboardClock size={18} />}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.title}</b><small className="block truncate text-xs text-[var(--muted)]">{item.detail}</small></span><span className={`text-right text-xs font-extrabold ${item.danger ? "text-red-600" : item.positive ? "text-emerald-600" : "text-[var(--muted)]"}`}><span className="block">{item.meta}</span><span className="font-medium text-[var(--muted)]">{formatDate(item.date)}</span></span></Link>) : <EmptyState icon={<ClipboardClock size={22} />} text={empty} />}</div></section>;
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm text-[var(--muted)]"><span className="text-[var(--primary)]">{icon}</span>{text}</div>; }
function formatNumber(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value); }
function formatMoney(value: number) { return `฿${new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`; }
function formatDate(value: Date) { return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(value); }
