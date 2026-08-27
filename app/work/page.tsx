import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { FilterBar } from "../../components/filter-bar";
import { PreserveListPositionLink, RestoreListPosition } from "../../components/preserve-list-position";
import { StatusBadge } from "../../components/status-badge";
import { StatusKpiStrip } from "../../components/status-kpi-strip";
import { UserAvatar } from "../../components/user-avatar";
import { db } from "../../lib/db";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { paginationWindow } from "../../lib/pagination-window";
import { getActiveCategoriesForPlantScope, getActiveClaimantsForReportScope, getActiveZonesForReportScope } from "../../lib/query-cache";
import { requireUser } from "../../lib/session";
import { canClaimWork } from "../../modules/auth/permission";
import { canUseUserPermission, PermissionKey } from "../../modules/auth/site-admin-permissions";
import { claimWork, updateWorkRequest } from "../../modules/cm-work/cm-work-service";
import { urgencyLabels, WorkStatus, type Actor, type Urgency } from "../../modules/cm-work/cm-work-types";
import { hasExplicitCmDateFilter, parseCmDateFilter, type CmDateFilterInput, type ParsedCmDateFilter } from "../../modules/filters/cm-date-filter";
import { getCmDatePreset } from "../../modules/filters/cm-date-filter-presets";
import { getUnreadSummary, getUnreadWorkIds, markStatusGroupRead, markWorkRead } from "../../modules/notifications/notification-service";
import { buildUserOperationalScope, type OperationalScope } from "../../modules/organization/user-plant-scope";

type WorkSearchParams = CmDateFilterInput & {
  search?: string;
  status?: string;
  statusGroup?: string;
  categoryId?: string;
  zoneId?: string;
  urgency?: string;
  claimantId?: string;
  page?: string;
  editWorkId?: string;
};

const IN_PROCESS_GROUP = "IN_PROCESS";
const pageSize = 50;
const workEditLabelClass = "grid gap-1.5 text-sm font-bold text-[var(--ink)]";
const workEditInputClass = "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
const inProcessStatuses = [
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.BACKLOG_SHUTDOWN,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
];
const sharedWorkFilterKeys = [
  "search",
  "categoryId",
  "zoneId",
  "urgency",
  "claimantId",
  "mode",
  "date",
  "startDate",
  "endDate",
  "month",
  "year",
] as const;
const pagedWorkFilterKeys = [...sharedWorkFilterKeys, "status", "statusGroup"] as const;

export default async function WorkListPage({ searchParams }: { searchParams: Promise<WorkSearchParams> }) {
  const user = await requireUser();
  const filters = normalizeFilters(await searchParams);
  const hasExplicitDateFilter = hasExplicitCmDateFilter(filters);
  const dateFilter = safeParseDateFilter(filters, hasExplicitDateFilter);
  const scope = buildUserOperationalScope(user);
  const where = buildWorkWhere(filters, dateFilter, scope);
  const statusSummaryWhere = buildWorkWhere({ ...filters, status: undefined, statusGroup: undefined }, dateFilter, scope);
  const currentPage = normalizePage(filters.page);
  const skip = (currentPage - 1) * pageSize;
  const actor: Actor = {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
  const returnTo = buildWorkListHref(filters);
  const workListPositionKey = `work:${returnTo}`;
  const canEditWorkRequest = canUseUserPermission(user, PermissionKey.EDIT_WORK_REQUEST);

  async function claimFromListAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const workId = String(formData.get("workId") ?? "");
    const safeReturnTo = String(formData.get("returnTo") ?? "/work");
    await claimWork({
      id: currentUser.id,
      role: currentUser.role as Actor["role"],
      categoryId: currentUser.categoryId,
      categoryIds: currentUser.categories.map((category) => category.categoryId),
      plantId: currentUser.plantId,
      siteAdminPermissions: currentUser.siteAdminPermissions,
    }, workId);
    redirect(safeReturnTo.startsWith("/work") ? safeReturnTo : "/work");
  }

  async function markStatusReadAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const group = String(formData.get("group") ?? "");
    const scope = buildUserOperationalScope(currentUser);
    if (Object.values(WorkStatus).includes(group as WorkStatus)) {
      await markStatusGroupRead(currentUser.id, group, scope);
    }
  }

  async function openWorkAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const scope = buildUserOperationalScope(currentUser);
    const workId = String(formData.get("workId") ?? "");
    const work = await db.cmWork.findFirst({ where: { id: workId, ...buildWorkScopeWhere(scope) }, select: { id: true } });
    if (!work) redirect("/work");
    await markWorkRead(currentUser.id, work.id, scope);
    redirect(`/work/${work.id}`);
  }

  async function updateWorkFromListAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const scope = buildUserOperationalScope(currentUser);
    const workId = String(formData.get("workId") ?? "");
    const safeReturnTo = String(formData.get("returnTo") ?? "/work");
    const scopedWork = await db.cmWork.findFirst({ where: { id: workId, ...buildWorkScopeWhere(scope) }, select: { id: true } });
    if (!scopedWork) redirect("/work");
    await updateWorkRequest({
      id: currentUser.id,
      role: currentUser.role as Actor["role"],
      organizationId: currentUser.organizationId,
      plantId: scope.plantId,
      categoryId: currentUser.categoryId,
      categoryIds: currentUser.categories.map((category) => category.categoryId),
      siteAdminPermissions: currentUser.siteAdminPermissions,
      rolePermissionOverrides: currentUser.rolePermissionOverrides,
      userPermissionOverrides: currentUser.userPermissionOverrides,
    }, workId, {
      requesterName: String(formData.get("requesterName") ?? ""),
      requesterDepartment: String(formData.get("requesterDepartment") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      zoneId: String(formData.get("zoneId") ?? ""),
      assetId: String(formData.get("assetId") ?? "") || null,
      machineName: String(formData.get("machineName") ?? ""),
      problemTitle: String(formData.get("problemTitle") ?? ""),
      problemDetail: String(formData.get("problemDetail") ?? ""),
      urgency: String(formData.get("urgency") ?? "") as Urgency,
    });
    redirect(safeReturnTo.startsWith("/work") ? safeReturnTo : "/work");
  }
  const [works, total, categories, zones, claimants, byStatus, unreadSummary] = await Promise.all([
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
    getActiveCategoriesForPlantScope(scope.plantId, scope.organizationId ?? user.organizationId),
    getActiveZonesForReportScope(scope),
    getActiveClaimantsForReportScope(scope),
    db.cmWork.groupBy({ by: ["status"], where: statusSummaryWhere, _count: { _all: true } }),
    getUnreadSummary(user.id, scope),
  ]);
  const unreadWorkIds = await getUnreadWorkIds(user.id, works.map((work) => work.id), scope);
  const editWork = canEditWorkRequest && filters.editWorkId
    ? works.find((work) => work.id === filters.editWorkId) ?? null
    : null;
  const [editCategories, editZones, editAssets] = editWork?.plantId
    ? await Promise.all([
        db.category.findMany({ where: { active: true, AND: [{ OR: [{ organizationId: editWork.organizationId }, { organizationId: null }] }, { OR: [{ plantId: editWork.plantId }, { plantId: null }] }] }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        db.zone.findMany({ where: { active: true, OR: [{ plantId: editWork.plantId }, { plantId: null }] }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        db.asset.findMany({ where: { registrationStatus: "ACTIVE", plantId: editWork.plantId }, select: { id: true, code: true, nameEn: true, nameTh: true, zoneId: true }, orderBy: [{ code: "asc" }, { nameTh: "asc" }] }),
      ])
    : [[], [], []];
  const statusCountByKey = new Map<WorkStatus, number>(byStatus.map((item) => [item.status as WorkStatus, item._count._all]));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  return (
    <AppShell>
      <RestoreListPosition enabled={!editWork} storageKey={workListPositionKey} />
      <section className="menu-heading-plain cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
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
          <p className="mt-2 text-white/80">ค้นหาและกรองงานตามสถานะ หมวด โซน ความเร่งด่วน ช่วงวันที่ และผู้รับงาน</p>
        </div>
      </section>

      <section className="relative z-20 mt-4">
        <FilterBar
          values={filters}
          categories={categories}
          zones={zones}
          claimants={claimants.map((user) => ({ id: user.id, name: user.fullName }))}
          initiallyUnset={!hasExplicitDateFilter}
        />
      </section>

      <StatusKpiStrip
        statusCountByKey={statusCountByKey}
        activeStatus={filters.status}
        getHref={(status) => buildStatusFilterHref(filters, status)}
        unreadCountByStatus={unreadSummary.byStatus}
        readAction={markStatusReadAction}
      />

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
              <div key={work.id} id={`work-row-${work.id}`} className="grid gap-3 border-b border-[var(--line)] bg-[var(--surface)] p-4 transition duration-300 ease-out last:border-b-0 hover:bg-[var(--soft)] md:grid-cols-[1fr_auto]">
                <form action={openWorkAction} className="min-w-0">
                  <input name="workId" type="hidden" value={work.id} />
                  <button className="relative block w-full min-w-0 rounded-xl text-left transition duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]" type="submit">
                  {unreadWorkIds.has(work.id) ? <span aria-label="Unread work update" className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 shadow-sm ring-2 ring-[var(--surface)]" /> : null}
                  <strong className="block text-lg">{work.number}</strong>
                  <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">
                    Category: {work.category.name} · Zone: {work.zone.name}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                    {work.claimant ? <UserAvatar fullName={work.claimant.fullName} hasPhoto={Boolean(work.claimant.profilePhoto)} size="sm" userId={work.claimant.id} version={work.claimant.profilePhoto?.updatedAt.getTime()} /> : null}
                    <span>
                      Date: {formatThaiDateTime(getStatusDate(work))} · Assignee: {work.claimant?.fullName ?? "-"} · Work: {work.problemTitle}
                    </span>
                  </span>
                  <span className="hidden">
                    {work.machineName} · {work.category.name} · {work.zone.name} · ผู้รับงาน: {work.claimant?.fullName ?? "-"}
                  </span>
                  </button>
                </form>
                <span data-reveal-section className="flex flex-wrap items-start justify-start gap-2 md:justify-end">
                  <StatusBadge status={work.status} />
                  {canClaimWork(actor, work) ? (
                    <form action={claimFromListAction}>
                      <input name="workId" type="hidden" value={work.id} />
                      <input name="returnTo" type="hidden" value={returnTo} />
                       <button className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]" type="submit">
                         <span>รับงาน</span>
                       </button>
                    </form>
                  ) : null}
                  {canEditWorkRequest ? (
                    <PreserveListPositionLink className="rounded-full border border-[var(--line)] px-4 py-1.5 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40" href={buildWorkEditHref(filters, work.id)} storageKey={workListPositionKey} targetId={`work-row-${work.id}`}>
                      แก้ไข
                    </PreserveListPositionLink>
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
      {editWork ? (
        <>
          <Link aria-label="ปิดหน้าต่างแก้ไขใบแจ้งซ่อม" className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" href={`${returnTo}#work-row-${editWork.id}`} scroll={false} />
          <aside aria-labelledby="edit-work-title" className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7" id="edit-work-drawer">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
              <div><p className="text-sm font-bold text-[var(--primary)]">Edit Repair Request</p><h2 className="mt-1 text-2xl font-extrabold" id="edit-work-title">{editWork.number}</h2><p className="mt-1 text-sm text-[var(--muted)]">ทุกการเปลี่ยนแปลงถูกบันทึกใน Audit Log</p></div>
              <Link className="rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold" href={`${returnTo}#work-row-${editWork.id}`} scroll={false}>ปิด</Link>
            </div>
            <form action={updateWorkFromListAction} className="mt-5 grid gap-4">
              <input name="workId" type="hidden" value={editWork.id} /><input name="returnTo" type="hidden" value={`${returnTo}#work-row-${editWork.id}`} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={workEditLabelClass}>ชื่อผู้แจ้ง<input className={workEditInputClass} defaultValue={editWork.requesterName} maxLength={120} name="requesterName" required /></label>
                <label className={workEditLabelClass}>หน่วยงาน / แผนก<input className={workEditInputClass} defaultValue={editWork.requesterDepartment} maxLength={120} name="requesterDepartment" required /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={workEditLabelClass}>Category<select className={workEditInputClass} defaultValue={editWork.categoryId} name="categoryId" required>{editCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label className={workEditLabelClass}>Zone<select className={workEditInputClass} defaultValue={editWork.zoneId} name="zoneId" required>{editZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
              </div>
              <label className={workEditLabelClass}>เชื่อมกับทะเบียน Asset (ไม่บังคับ)<select className={workEditInputClass} defaultValue={editWork.assetId ?? ""} name="assetId"><option value="">ไม่เชื่อมทะเบียน Asset</option>{editAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code ?? "—"} · {asset.nameEn?.trim() || asset.nameTh}{asset.zoneId ? ` · ${editZones.find((zone) => zone.id === asset.zoneId)?.name ?? ""}` : ""}</option>)}</select></label>
              <label className={workEditLabelClass}>ชื่อเครื่องจักร<input className={workEditInputClass} defaultValue={editWork.machineName} maxLength={200} name="machineName" required /></label>
              <label className={workEditLabelClass}>หัวข้อปัญหา<input className={workEditInputClass} defaultValue={editWork.problemTitle} maxLength={200} name="problemTitle" required /></label>
              <label className={workEditLabelClass}>รายละเอียดปัญหา<textarea className={`${workEditInputClass} min-h-32 py-3`} defaultValue={editWork.problemDetail} maxLength={4000} name="problemDetail" required /></label>
              <label className={workEditLabelClass}>สถานะความเร่งด่วน<select className={workEditInputClass} defaultValue={editWork.urgency} name="urgency" required>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-end gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:-mx-7 sm:px-7">
                <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] px-5 font-bold" href={`${returnTo}#work-row-${editWork.id}`} scroll={false}>ยกเลิก</Link><button className="min-h-12 rounded-xl bg-[var(--primary)] px-6 font-extrabold text-white transition hover:bg-[var(--primary-strong)]" type="submit">บันทึกการแก้ไข</button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
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
    case WorkStatus.BACKLOG_SHUTDOWN:
      return work.statusHistory[0]?.changedAt ?? work.inProgressAt ?? work.createdAt;
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

function buildStatusFilterHref(filters: WorkSearchParams, status: WorkStatus) {
  const params = new URLSearchParams();
  for (const key of sharedWorkFilterKeys) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  params.set("status", status);
  return `/work?${params.toString()}`;
}

function buildWorkListHref(filters: WorkSearchParams) {
  const params = new URLSearchParams();
  for (const key of [...pagedWorkFilterKeys, "page"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/work?${query}` : "/work";
}

function buildWorkEditHref(filters: WorkSearchParams, workId: string) {
  const params = new URLSearchParams();
  for (const key of [...pagedWorkFilterKeys, "page"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  params.set("editWorkId", workId);
  return `/work?${params.toString()}#edit-work-drawer`;
}
function Pagination({ filters, currentPage, totalPages }: { filters: WorkSearchParams; currentPage: number; totalPages: number }) {
  const pages = paginationWindow(currentPage, totalPages);
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
  for (const key of pagedWorkFilterKeys) {
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

function buildWorkWhere(filters: WorkSearchParams, dateFilter: ParsedCmDateFilter, scope?: OperationalScope): Prisma.CmWorkWhereInput {
  const where: Prisma.CmWorkWhereInput = {};

  if (scope?.organizationId) where.organizationId = scope.organizationId;
  if (scope?.plantId) where.plantId = scope.plantId;
  if (filters.status) where.status = filters.status;
  else if (filters.statusGroup === IN_PROCESS_GROUP) where.status = { in: inProcessStatuses };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.zoneId) where.zoneId = filters.zoneId;
  if (filters.urgency) where.urgency = filters.urgency;
  if (filters.claimantId) where.claimantId = filters.claimantId;
  if (dateFilter.start && dateFilter.endExclusive) {
    where.createdAt = { gte: dateFilter.start, lt: dateFilter.endExclusive };
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

function buildWorkScopeWhere(scope?: OperationalScope): Prisma.CmWorkWhereInput {
  if (scope?.plantId) return { plantId: scope.plantId };
  if (scope?.organizationId) return { organizationId: scope.organizationId };
  return {};
}

function safeParseDateFilter(input: CmDateFilterInput, hasExplicitDateFilter: boolean) {
  const yearToDate = getCmDatePreset("yearToDate");
  try {
    return parseCmDateFilter(hasExplicitDateFilter ? input : yearToDate);
  } catch {
    return parseCmDateFilter(yearToDate);
  }
}
