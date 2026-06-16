import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { FilterBar } from "../../components/filter-bar";
import { StatusBadge } from "../../components/status-badge";
import { StatusKpiStrip } from "../../components/status-kpi-strip";
import { UserAvatar } from "../../components/user-avatar";
import { db } from "../../lib/db";
import { getActiveCategories, getActiveClaimants, getActiveZones } from "../../lib/query-cache";
import { requireUser } from "../../lib/session";
import { canClaimWork } from "../../modules/auth/permission";
import { claimWork } from "../../modules/cm-work/cm-work-service";
import { WorkStatus, type Actor } from "../../modules/cm-work/cm-work-types";

type WorkSearchParams = {
  search?: string;
  status?: string;
  statusGroup?: string;
  categoryId?: string;
  zoneId?: string;
  urgency?: string;
  claimantId?: string;
  month?: string;
  page?: string;
};

const IN_PROCESS_GROUP = "IN_PROCESS";
const pageSize = 50;
const inProcessStatuses = [
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
];

export default async function WorkListPage({ searchParams }: { searchParams: Promise<WorkSearchParams> }) {
  const user = await requireUser();
  const filters = normalizeFilters(await searchParams);
  const where = buildWorkWhere(filters);
  const statusSummaryWhere = buildWorkWhere({ ...filters, status: undefined, statusGroup: undefined });
  const currentPage = normalizePage(filters.page);
  const skip = (currentPage - 1) * pageSize;
  const actor: Actor = { id: user.id, role: user.role as Actor["role"], categoryId: user.categoryId };
  const returnTo = buildWorkListHref(filters);

  async function claimFromListAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const workId = String(formData.get("workId") ?? "");
    const safeReturnTo = String(formData.get("returnTo") ?? "/work");
    await claimWork({ id: currentUser.id, role: currentUser.role as Actor["role"], categoryId: currentUser.categoryId }, workId);
    redirect(safeReturnTo.startsWith("/work") ? safeReturnTo : "/work");
  }

  const [works, total, categories, zones, claimants, byStatus] = await Promise.all([
    db.cmWork.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        category: true,
        zone: true,
        claimant: { include: { profilePhoto: true } },
        statusHistory: { orderBy: { changedAt: "desc" }, take: 1 },
      },
    }),
    db.cmWork.count({ where }),
    getActiveCategories(),
    getActiveZones(),
    getActiveClaimants(),
    db.cmWork.groupBy({ by: ["status"], where: statusSummaryWhere, _count: { _all: true } }),
  ]);
  const statusCountByKey = new Map<WorkStatus, number>(byStatus.map((item) => [item.status as WorkStatus, item._count._all]));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  return (
    <AppShell>
      <section className="cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
        <div className="plant-skyline" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="relative z-10">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">CM Work List</p>
          <h1 className="mt-5 text-4xl font-extrabold">รายการงานทั้งหมด</h1>
          <p className="mt-2 text-white/80">ค้นหาและกรองงานตามสถานะ หมวด โซน ความเร่งด่วน เดือน และผู้รับงาน</p>
        </div>
      </section>

      <section className="relative z-20 -mt-7">
        <FilterBar values={filters} categories={categories} zones={zones} claimants={claimants.map((user) => ({ id: user.id, name: user.fullName }))} />
      </section>

      <StatusKpiStrip statusCountByKey={statusCountByKey} activeStatus={filters.status} getHref={(status) => buildStatusFilterHref(filters, status)} />

      {filters.statusGroup === IN_PROCESS_GROUP ? (
        <section className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow)]">
          <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-semibold">In Process</span>
          <span className="text-sm text-[var(--muted)]">รอรับงาน + รับเรื่องแล้ว + กำลังดำเนินการ + รอปิดงาน + ส่งกลับให้แก้ไข</span>
          <Link className="ml-auto rounded-full border border-[var(--line)] px-3 py-1 text-sm font-semibold" href="/work">
            Clear filters
          </Link>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Work Results</h2>
          <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-[var(--muted)]">
            {total} items · Page {safeCurrentPage}/{totalPages}
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)]">
          {works.length ? (
            works.map((work) => (
              <div key={work.id} className="grid gap-3 border-b border-[var(--line)] bg-[var(--surface)] p-4 last:border-b-0 hover:bg-[var(--soft)] md:grid-cols-[1fr_auto]">
                <Link className="min-w-0" href={`/work/${work.id}`}>
                <span>
                  <strong className="block text-lg">{work.number}</strong>
                  <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">
                    Category: {work.category.name} · Zone: {work.zone.name}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                    {work.claimant ? <UserAvatar fullName={work.claimant.fullName} hasPhoto={Boolean(work.claimant.profilePhoto)} size="sm" userId={work.claimant.id} version={work.claimant.profilePhoto?.updatedAt.getTime()} /> : null}
                    <span>
                      Date: {formatStatusDate(getStatusDate(work))} · Assignee: {work.claimant?.fullName ?? "-"} · Work: {work.problemTitle}
                    </span>
                  </span>
                  <span className="hidden">
                    {work.machineName} · {work.category.name} · {work.zone.name} · ผู้รับงาน: {work.claimant?.fullName ?? "-"}
                  </span>
                </span>
                </Link>
                <span className="flex flex-wrap items-start justify-start gap-2 md:justify-end">
                  <StatusBadge status={work.status} />
                  {canClaimWork(actor, work) ? (
                    <form action={claimFromListAction}>
                      <input name="workId" type="hidden" value={work.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <button className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]" type="submit">
                        <span>รับงาน</span>
                        <span className="hidden">
                        à¸£à¸±à¸šà¸‡à¸²à¸™
                        </span>
                      </button>
                    </form>
                  ) : null}
                </span>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-[var(--muted)]">ไม่พบรายการงานตามเงื่อนไขที่เลือก</p>
          )}
        </div>
        {totalPages > 1 ? <Pagination filters={filters} currentPage={safeCurrentPage} totalPages={totalPages} /> : null}
      </section>
    </AppShell>
  );
}

type StatusDateInput = {
  status: string;
  createdAt: Date;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  waitingToCloseAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;
  statusHistory: { changedAt: Date }[];
};

function getStatusDate(work: StatusDateInput) {
  switch (work.status) {
    case WorkStatus.NEW:
      return work.createdAt;
    case WorkStatus.CLAIMED:
      return work.claimedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.IN_PROGRESS:
      return work.inProgressAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.WAITING_TO_CLOSE:
      return work.waitingToCloseAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.CLOSED:
      return work.closedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.CANCELED:
      return work.canceledAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt;
    case WorkStatus.WAITING_TO_CLAIM:
    case WorkStatus.RETURNED_FOR_CORRECTION:
    default:
      return work.statusHistory[0]?.changedAt ?? work.createdAt;
  }
}

function formatStatusDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function buildStatusFilterHref(filters: WorkSearchParams, status: WorkStatus) {
  const params = new URLSearchParams();
  for (const key of ["search", "categoryId", "zoneId", "urgency", "claimantId", "month"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  params.set("status", status);
  return `/work?${params.toString()}`;
}

function buildWorkListHref(filters: WorkSearchParams) {
  const params = new URLSearchParams();
  for (const key of ["search", "status", "statusGroup", "categoryId", "zoneId", "urgency", "claimantId", "month", "page"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/work?${query}` : "/work";
}

function Pagination({ filters, currentPage, totalPages }: { filters: WorkSearchParams; currentPage: number; totalPages: number }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <nav className="mt-5 flex flex-wrap items-center justify-end gap-2" aria-label="Work results pagination">
      <PageLink filters={filters} page={Math.max(1, currentPage - 1)} disabled={currentPage === 1} label="ก่อนหน้า" />
      {pages.map((page) => (
        <PageLink key={page} filters={filters} page={page} active={page === currentPage} label={String(page)} />
      ))}
      <PageLink filters={filters} page={Math.min(totalPages, currentPage + 1)} disabled={currentPage === totalPages} label="ถัดไป" />
    </nav>
  );
}

function PageLink({ filters, page, label, active = false, disabled = false }: { filters: WorkSearchParams; page: number; label: string; active?: boolean; disabled?: boolean }) {
  const href = disabled ? "#" : buildPageHref(filters, page);
  const className = active
    ? "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm"
    : disabled
      ? "pointer-events-none rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] opacity-50"
      : "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--soft)]";

  return (
    <Link aria-current={active ? "page" : undefined} className={className} href={href}>
      {label}
    </Link>
  );
}

function buildPageHref(filters: WorkSearchParams, page: number) {
  const params = new URLSearchParams();
  for (const key of ["search", "status", "statusGroup", "categoryId", "zoneId", "urgency", "claimantId", "month"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/work?${query}` : "/work";
}

function normalizePage(value?: string) {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeFilters(params: WorkSearchParams): WorkSearchParams {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""]).filter(([, value]) => value)) as WorkSearchParams;
}

function buildWorkWhere(filters: WorkSearchParams): Prisma.CmWorkWhereInput {
  const where: Prisma.CmWorkWhereInput = {};

  if (filters.status) where.status = filters.status;
  else if (filters.statusGroup === IN_PROCESS_GROUP) where.status = { in: inProcessStatuses };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.zoneId) where.zoneId = filters.zoneId;
  if (filters.urgency) where.urgency = filters.urgency;
  if (filters.claimantId) where.claimantId = filters.claimantId;
  if (filters.month) {
    const range = monthRange(filters.month);
    if (range) where.createdAt = { gte: range.start, lt: range.end };
  }
  if (filters.search) {
    where.OR = [
      { number: { contains: filters.search } },
      { machineName: { contains: filters.search } },
      { requesterName: { contains: filters.search } },
      { requesterDepartment: { contains: filters.search } },
      { problemTitle: { contains: filters.search } },
    ];
  }

  return where;
}

function monthRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return null;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}
