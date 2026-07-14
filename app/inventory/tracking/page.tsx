import { PackageSearch, Search } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { StoreIssueStatus } from "../../../modules/store/store-types";

type PageQuery = { organizationId?: string; plantId?: string; number?: string };

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
          cmWork: { select: { number: true } },
          items: {
            include: {
              store: { select: { code: true } },
              sparePart: { select: { code: true, name: true, unit: true } },
            },
          },
        },
      })
    : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
            <PackageSearch size={16} />
            Store Inventory
          </p>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Store Tracking</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">ค้นหาสถานะด้วยเลขที่ใบเบิก โดยแสดงเฉพาะข้อมูลภายใน Site ที่เลือก</p>
        </section>

        <AdminSiteScopeSelector action="/inventory/tracking" scope={scope} title="Site สำหรับติดตามใบเบิก" />

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <form action="/inventory/tracking" className="flex flex-col gap-3 sm:flex-row">
            <AdminScopeHiddenFields scope={scope} />
            <label className="flex-1">
              <span className="sr-only">เลขที่ใบเบิก</span>
              <input className={inputClass} defaultValue={number} name="number" placeholder="เช่น SI-RTB-2026-07-0001" required />
            </label>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white">
              <Search size={18} />
              ค้นหา
            </button>
          </form>
        </section>

        {number && !issue ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center font-bold text-amber-700 dark:text-amber-300">
            ไม่พบเลขที่ใบเบิกใน Site นี้
          </p>
        ) : null}

        {issue ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xl font-extrabold text-[var(--primary)]">{issue.number}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {issue.cmWork?.number ? `CM: ${issue.cmWork.number}` : "เบิกโดยตรง"} · {formatThaiMediumDateTime(issue.requestedAt)}
                </p>
              </div>
              <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-extrabold">{statusLabel(issue.status)}</span>
            </div>
            <StoreTrackingTimeline status={issue.status} />
            <div className="mt-5 grid gap-3">
              {issue.items.map((item) => (
                <article className="grid gap-2 rounded-2xl bg-[var(--soft)] p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                  <div>
                    <p className="font-bold">{item.sparePart.code} · {item.sparePart.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Store {item.store?.code ?? "-"}</p>
                  </div>
                  <p className="font-bold">
                    จ่ายแล้ว {formatQty(Number(item.issuedQty ?? 0))} / {formatQty(Number(item.approvedQty ?? item.requestedQty))} {item.sparePart.unit}
                  </p>
                </article>
              ))}
            </div>
            {issue.rejectReason ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">หมายเหตุ: {issue.rejectReason}</p> : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function StoreTrackingTimeline({ status }: { status: string }) {
  const steps = [
    {
      key: "request",
      label: "ส่งคำขอเบิก",
      statuses: [
        StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
        StoreIssueStatus.RETURNED_FOR_EDIT,
        StoreIssueStatus.ENGINEER_REJECTED,
      ],
    },
    {
      key: "approve",
      label: "อนุมัติ / รอจ่าย",
      statuses: [
        StoreIssueStatus.WAITING_STORE_ISSUE,
        StoreIssueStatus.PARTIALLY_ISSUED,
        StoreIssueStatus.NOT_ENOUGH_STOCK,
        StoreIssueStatus.STORE_REJECTED,
      ],
    },
    {
      key: "issued",
      label: "จ่ายสำเร็จ",
      statuses: [StoreIssueStatus.ISSUED],
    },
  ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.statuses.includes(status as never)));
  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const active = index <= currentIndex;
          return (
            <div className="store-tracking-step relative grid gap-2 sm:pr-4" key={step.key}>
              <div className="flex items-center gap-2">
                <span className={`flex size-9 items-center justify-center rounded-full text-sm font-extrabold ${active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
                  {index + 1}
                </span>
                <span className={`text-sm font-extrabold ${active ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>{step.label}</span>
              </div>
              {index < steps.length - 1 ? (
                <span className={`hidden h-1 rounded-full sm:block ${index < currentIndex ? "bg-[var(--primary)]" : "bg-[var(--line)]"}`} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับแก้ไข",
    [StoreIssueStatus.ENGINEER_REJECTED]: "Engineer Reject",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่าย",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.ISSUED]: "จ่ายครบแล้ว",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
    [StoreIssueStatus.STORE_REJECTED]: "Store Reject",
    [StoreIssueStatus.CANCELED]: "ยกเลิก",
  };
  return labels[status] ?? status;
}

function formatQty(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono text-[var(--ink)] outline-none focus:border-[var(--primary)]";
