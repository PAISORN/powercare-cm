import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  PackageCheck,
  PackageSearch,
  Search,
  ShoppingCart,
  UserRound,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { StoreIssueStatus, StoreIssueType } from "../../../modules/store/store-types";

type PageQuery = { organizationId?: string; plantId?: string; number?: string };
type ProgressState = "done" | "active" | "error" | "pending";

export default async function StoreTrackingPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  if (!canUseUserPermission(user, PermissionKey.VIEW_STORE_TRACKING)) redirect("/dashboard");
  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const number = query.number?.trim().toUpperCase() ?? "";
  const issue = number
    ? await db.sparePartIssue.findFirst({
        where: { number, plantId: scope.plant.id, organizationId: scope.organization.id },
        include: {
          organization: { select: { name: true } },
          plant: { select: { name: true, inventoryCode: true } },
          cmWork: { select: { number: true, machineName: true, problemTitle: true } },
          requesterUser: { select: { fullName: true, department: true } },
          engineer: { select: { fullName: true } },
          storeOfficer: { select: { fullName: true } },
          items: {
            include: {
              store: { select: { code: true, name: true, location: true } },
              zone: { select: { name: true } },
              sparePart: {
                select: {
                  code: true,
                  itemCode: true,
                  name: true,
                  unit: true,
                  category: { select: { name: true } },
                  type: { select: { name: true } },
                },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      })
    : null;
  const auditEvents = issue
    ? await db.auditEvent.findMany({
        where: { entityType: "SparePartIssue", entityId: issue.id },
        include: { actor: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
            <PackageSearch size={16} />
            Store Inventory
          </p>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Store Tracking</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            ค้นหาเลขที่ใบเบิก เพื่อดูสถานะล่าสุด รายละเอียดอะไหล่ และประวัติการดำเนินงานภายใน Site
          </p>
        </section>

        <AdminSiteScopeSelector action="/inventory/tracking" scope={scope} title="Site สำหรับติดตามใบเบิก" />

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <form action="/inventory/tracking" className="flex flex-col gap-3 sm:flex-row">
            <AdminScopeHiddenFields scope={scope} />
            <label className="flex-1">
              <span className="sr-only">เลขที่ใบเบิก</span>
              <input className={inputClass} defaultValue={number} name="number" placeholder="เช่น SI-RTB-2026-07-0001" required />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white transition hover:brightness-105">
              <Search size={18} />
              ค้นหา
            </button>
          </form>
        </section>

        {number && !issue ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center font-bold text-amber-700 dark:text-amber-300">
            ไม่พบเลขที่ใบเบิกนี้ใน Site ที่เลือก
          </p>
        ) : null}

        {issue ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
            <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">สถานะล่าสุด</p>
                <h2 className={`mt-1 text-3xl font-extrabold ${statusTextClass(issue.status)}`}>{statusLabel(issue.status)}</h2>
                <p className="mt-2 font-mono text-lg font-extrabold text-[var(--primary)]">{issue.number}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {issue.cmWork ? `${issue.cmWork.machineName} · ${issue.cmWork.problemTitle}` : "ใบเบิกอะไหล่โดยตรง"}
                </p>
              </div>
              <div className="grid content-start gap-1 text-sm xl:text-right">
                <p><strong>Organization:</strong> {issue.organization.name}</p>
                <p><strong>Site:</strong> {issue.plant.name}</p>
                <p><strong>ประเภท:</strong> {issueTypeLabel(issue.issueType)}</p>
                <p><strong>เลขที่ CM:</strong> {issue.cmWork?.number ?? "-"}</p>
              </div>
            </div>

            <StoreTrackingStepper issue={issue} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold"><ClipboardList size={19} /> รายละเอียดใบเบิก</h3>
                <dl className="mt-4 grid gap-3 text-sm">
                  <InfoRow label="ผู้ขอเบิก" value={issue.requesterUser?.fullName ?? issue.requesterName} />
                  <InfoRow label="หน่วยงาน / แผนก" value={issue.requesterUser?.department ?? issue.requesterDepartment ?? "-"} />
                  <InfoRow label="ช่องทางติดต่อ" value={issue.requesterContact ?? "-"} />
                  <InfoRow label="วันที่ขอเบิก" value={formatThaiMediumDateTime(issue.requestedAt)} />
                  <InfoRow label="Engineer ผู้อนุมัติ" value={issue.engineer?.fullName ?? "-"} />
                  <InfoRow label="Store Officer" value={issue.storeOfficer?.fullName ?? "-"} />
                  <InfoRow label="หมายเหตุ" value={issue.note ?? "-"} />
                </dl>
                {issue.rejectReason ? (
                  <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <strong>เหตุผล:</strong> {issue.rejectReason}
                  </p>
                ) : null}
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck size={19} /> ประวัติสถานะ</h3>
                <div className="mt-4 grid gap-0">
                  {auditEvents.length ? auditEvents.map((event, index) => {
                    const details = readAuditDetails(event.afterJson);
                    return (
                      <TimelineRow
                        active={index === auditEvents.length - 1}
                        actor={event.actor?.fullName ?? (event.action === "CREATE_PUBLIC_STORE_ISSUE" ? issue.requesterName : "ระบบ")}
                        key={event.id}
                        note={typeof details.reason === "string" ? details.reason : auditActionNote(event.action, details)}
                        time={event.createdAt}
                        title={auditActionLabel(event.action)}
                      />
                    );
                  }) : (
                    <TimelineRow active actor={issue.requesterName} note={issue.note} time={issue.requestedAt} title="ส่งคำขอเบิก" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart size={19} /> รายการอะไหล่</h3>
                <p className="text-sm font-semibold text-[var(--muted)]">{formatQty(issue.items.length)} รายการ</p>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)]">
                {issue.items.map((item, index) => (
                  <article className="grid gap-3 border-b border-[var(--line)] bg-[var(--card)] p-4 last:border-b-0 lg:grid-cols-[44px_minmax(190px,1.3fr)_minmax(150px,0.85fr)_minmax(130px,0.8fr)_auto] lg:items-center" key={item.id}>
                    <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--soft)] text-sm font-extrabold text-[var(--primary)]">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="font-bold">{item.sparePart.name}</p>
                      <p className="mt-0.5 break-all font-mono text-xs text-[var(--primary)]">{item.sparePart.code} · {item.sparePart.itemCode ?? "-"}</p>
                      {item.lineNumber ? <p className="mt-0.5 break-all font-mono text-[11px] text-[var(--muted)]">{item.lineNumber}</p> : null}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold">{item.store?.name ?? "ไม่ระบุคลัง"}</p>
                      <p className="text-xs text-[var(--muted)]">{item.store?.code ?? "-"} · {item.store?.location ?? "-"}</p>
                    </div>
                    <div className="text-sm">
                      <p><strong>Zone:</strong> {item.zone ? `${item.zoneCode ?? "-"} · ${item.zone.name}` : (item.zoneCode ?? "-")}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{item.sparePart.type?.name ?? "-"} · {item.sparePart.category?.name ?? "-"}</p>
                    </div>
                    <div className="grid min-w-[170px] grid-cols-3 gap-3 text-center text-sm">
                      <Quantity label="ขอเบิก" unit={item.sparePart.unit} value={Number(item.requestedQty)} />
                      <Quantity label="อนุมัติ" unit={item.sparePart.unit} value={Number(item.approvedQty ?? 0)} />
                      <Quantity label="จ่ายแล้ว" unit={item.sparePart.unit} value={Number(item.issuedQty ?? 0)} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function StoreTrackingStepper({
  issue,
}: {
  issue: {
    status: string;
    requestedAt: Date;
    engineerApprovedAt: Date | null;
    issuedAt: Date | null;
    rejectedAt: Date | null;
  };
}) {
  const engineerState: ProgressState = issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL
    ? "active"
    : [StoreIssueStatus.ENGINEER_REJECTED, StoreIssueStatus.RETURNED_FOR_EDIT].includes(issue.status as never)
      ? "error"
      : "done";
  const storeState: ProgressState = [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never)
    ? "active"
    : [StoreIssueStatus.NOT_ENOUGH_STOCK, StoreIssueStatus.STORE_REJECTED].includes(issue.status as never)
      ? "error"
      : issue.status === StoreIssueStatus.ISSUED ? "done" : "pending";
  const finalState: ProgressState = issue.status === StoreIssueStatus.ISSUED
    ? "done"
    : [StoreIssueStatus.CANCELED, StoreIssueStatus.ENGINEER_REJECTED, StoreIssueStatus.STORE_REJECTED, StoreIssueStatus.NOT_ENOUGH_STOCK].includes(issue.status as never)
      ? "error"
      : "pending";
  const stages = [
    { label: "ส่งคำขอเบิก", state: "done" as ProgressState, time: issue.requestedAt, icon: ClipboardList },
    { label: "Engineer อนุมัติ", state: engineerState, time: issue.engineerApprovedAt, icon: CheckCircle2 },
    { label: "Store จ่ายอะไหล่", state: storeState, time: issue.issuedAt, icon: ShoppingCart },
    { label: finalState === "error" ? "ยกเลิก / ปฏิเสธ" : "เสร็จสิ้น", state: finalState, time: finalState === "error" ? issue.rejectedAt : issue.issuedAt, icon: finalState === "error" ? XCircle : PackageCheck },
  ];

  return (
    <div className="mt-8 grid grid-cols-4 gap-1 sm:gap-2 md:gap-0">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        return (
          <div className="relative grid gap-1 text-center sm:gap-2 md:px-2" key={stage.label}>
            {index > 0 ? <span className={`absolute left-0 right-1/2 top-[22px] h-0.5 sm:top-7 sm:h-1 md:top-8 ${connectorClass(stages[index - 1].state)}`} /> : null}
            {index < stages.length - 1 ? <span className={`absolute left-1/2 right-0 top-[22px] h-0.5 sm:top-7 sm:h-1 md:top-8 ${connectorClass(stage.state)}`} /> : null}
            <span className={`relative z-10 mx-auto grid h-11 w-11 place-items-center rounded-full shadow-sm sm:h-14 sm:w-14 md:h-16 md:w-16 ${progressTone(stage.state)}`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            </span>
            <strong className="mx-auto max-w-[76px] text-[10px] font-bold leading-tight sm:max-w-[100px] sm:text-xs md:max-w-none md:text-sm">{stage.label}</strong>
            <span className="mx-auto hidden max-w-[150px] text-[10px] text-[var(--muted)] md:block">
              {stage.time ? formatThaiMediumDateTime(stage.time) : progressLabel(stage.state)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TimelineRow({ title, actor, time, note, active }: { title: string; actor: string; time: Date; note?: string | null; active?: boolean }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="grid justify-center">
        <span className={active ? "mt-1 h-4 w-4 rounded-full bg-emerald-500" : "mt-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-[var(--surface)]"} />
        <span className="mx-auto h-full min-h-10 w-0.5 bg-emerald-500/35" />
      </div>
      <div className="pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{title}</strong>
          <span className="text-sm text-[var(--muted)]">{formatThaiMediumDateTime(time)}</span>
        </div>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--muted)]"><UserRound size={13} /> โดย {actor}</p>
        {note ? <p className="mt-2 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{note}</p> : null}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-semibold">{value}</dd></div>;
}

function Quantity({ label, unit, value }: { label: string; unit: string; value: number }) {
  return <div><p className="text-[11px] text-[var(--muted)]">{label}</p><p className="font-extrabold">{formatQty(value)}</p><p className="text-[10px] text-[var(--muted)]">{unit}</p></div>;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับให้แก้ไข",
    [StoreIssueStatus.ENGINEER_REJECTED]: "Engineer ไม่อนุมัติ",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่ายอะไหล่",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายอะไหล่บางส่วน",
    [StoreIssueStatus.ISSUED]: "จ่ายอะไหล่ครบแล้ว",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "อะไหล่ไม่เพียงพอ",
    [StoreIssueStatus.STORE_REJECTED]: "Store ปฏิเสธ",
    [StoreIssueStatus.CANCELED]: "ยกเลิก",
  };
  return labels[status] ?? status;
}

function statusTextClass(status: string) {
  if (status === StoreIssueStatus.ISSUED) return "text-emerald-500";
  if ([StoreIssueStatus.ENGINEER_REJECTED, StoreIssueStatus.STORE_REJECTED, StoreIssueStatus.NOT_ENOUGH_STOCK, StoreIssueStatus.CANCELED].includes(status as never)) return "text-red-500";
  if (status === StoreIssueStatus.RETURNED_FOR_EDIT) return "text-amber-500";
  return "text-[var(--primary)]";
}

function issueTypeLabel(type: string) {
  return type === StoreIssueType.CM_REFERENCED ? "เบิกอ้างอิงงาน CM" : "เบิกโดยตรง";
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE_STORE_ISSUE: "ส่งคำขอเบิก",
    CREATE_PUBLIC_STORE_ISSUE: "ส่งคำขอเบิก",
    STORE_ISSUE_FROM_WORK_DETAIL: "สร้างใบเบิกจากงาน CM",
    STORE_ISSUE_APPROVE: "Engineer อนุมัติ",
    STORE_ISSUE_REJECT: "Engineer ไม่อนุมัติ",
    STORE_ISSUE_RETURN: "ส่งกลับให้แก้ไข",
    ISSUE_STORE_STOCK: "Store ดำเนินการจ่ายอะไหล่",
    STORE_ISSUE_NOT_ENOUGH_STOCK: "อะไหล่ไม่เพียงพอ",
  };
  return labels[action] ?? action.replaceAll("_", " ");
}

function auditActionNote(action: string, details: Record<string, unknown>) {
  if (action === "CREATE_STORE_ISSUE" || action === "CREATE_PUBLIC_STORE_ISSUE") {
    const count = typeof details.itemCount === "number" ? details.itemCount : null;
    return count ? `สร้างใบเบิกจำนวน ${formatQty(count)} รายการ` : null;
  }
  if (action === "ISSUE_STORE_STOCK" && typeof details.status === "string") return statusLabel(details.status);
  return null;
}

function readAuditDetails(value?: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function progressTone(state: ProgressState) {
  if (state === "done") return "bg-emerald-500 text-white";
  if (state === "active") return "bg-amber-500 text-white";
  if (state === "error") return "bg-red-500 text-white";
  return "bg-[var(--soft)] text-[var(--muted)]";
}

function connectorClass(state: ProgressState) {
  if (state === "done") return "bg-emerald-500";
  if (state === "error") return "bg-red-500/60";
  if (state === "active") return "bg-amber-500/60";
  return "bg-[var(--line)]";
}

function progressLabel(state: ProgressState) {
  if (state === "active") return "กำลังรอดำเนินการ";
  if (state === "error") return "ดำเนินการไม่สำเร็จ";
  return "ยังไม่ถึงขั้นตอนนี้";
}

function formatQty(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

const inputClass = "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono text-[var(--ink)] outline-none focus:border-[var(--primary)]";
