import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { PmRouteShell } from "../../../components/pm/pm-route-shell";
import { PmFilterBar } from "../../../components/pm/pm-filter-bar";
import { PmSummaryStrip } from "../../../components/pm/pm-summary-strip";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canExecutePmWork, canManagePmGroups, canViewPm } from "../../../modules/auth/permission";
import { resolvePmPageScope } from "../../../modules/pm/pm-page-scope";
import { parsePmWorkFilter, serializePmWorkFilter } from "../../../modules/pm/pm-filter";
import { isPmWorkOverdue, queryPmWorkPage } from "../../../modules/pm/pm-query";

type Query = { organizationId?: string; plantId?: string; startDate?: string; endDate?: string; groupId?: string; assetId?: string; assigneeId?: string; lifecycle?: string; overdue?: string; result?: string };
export default async function PmWorkPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser(); if (!canViewPm(user)) redirect("/dashboardcm");
  const raw = await searchParams; const scope = await resolvePmPageScope(user, raw); const serviceScope = { organizationId: scope.organization.id, plantId: scope.plant.id };
  const filterParams = new URLSearchParams(); Object.entries(raw).forEach(([key, value]) => { if (value) filterParams.set(key, value); });
  const filter = parsePmWorkFilter(filterParams); const [{ rows: works, total, summary }, groups, assets, assignees] = await Promise.all([
    queryPmWorkPage(filter, serviceScope),
    db.pmGroup.findMany({ where: { ...serviceScope }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }),
    db.asset.findMany({ where: { plantId: scope.plant.id, pmWorks: { some: { pmPlan: { organizationId: scope.organization.id } } } }, select: { id: true, code: true, nameTh: true }, orderBy: { code: "asc" } }),
    db.user.findMany({ where: { active: true, pmWorkAssignments: { some: { pmWork: { plantId: scope.plant.id, pmPlan: { organizationId: scope.organization.id } } } } }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);
  const query = new URLSearchParams(serviceScope).toString(); const exportParams = new URLSearchParams(serviceScope); new URLSearchParams(serializePmWorkFilter(filter)).forEach((v, k) => exportParams.set(k, v));
  return <AppShell><PmRouteShell title="PM Work" description={canExecutePmWork(user) ? "Claim, start and record PM results assigned to you." : "View PM work status for this Site."} scope={scope} currentPage="work" canManageGroups={canManagePmGroups(user)} scopeAction="/dashboardpm/work" />
    <main className="mx-auto mt-5 grid min-w-0 max-w-6xl gap-4" aria-label="PM work list"><PmFilterBar assets={assets.map(x => ({ id: x.id, label: `${x.code} · ${x.nameTh}` }))} assignees={assignees.map(x => ({ id: x.id, label: x.fullName }))} filter={filter} groups={groups.map(x => ({ id: x.id, label: `${x.code} · ${x.name}` }))} scope={serviceScope} /><PmSummaryStrip summary={summary} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-[var(--muted)]">พบ {total} รายการ{works.length < total ? ` · แสดง ${works.length} รายการแรก` : ""}</p><a className="min-h-11 rounded-2xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold" href={`/dashboardpm/export?${exportParams}`}>Export CSV</a></div>{works.map(work => <Link className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm hover:border-[var(--primary)]" href={`/dashboardpm/work/${work.id}?${query}`} key={work.id}>
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{work.number}</strong><span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-bold">{work.status}{isPmWorkOverdue(work.status, work.pmPlan.plannedDateKey, filter.todayDateKey) ? " · Overdue" : ""}</span></div><p className="mt-2 break-words">{work.assetCodeSnapshot ?? "—"} · {work.assetNameSnapshot}</p><p className="mt-1 break-words text-sm text-[var(--muted)]">Planned {work.pmPlan.plannedDateKey}{isPmWorkOverdue(work.status, work.pmPlan.plannedDateKey, filter.todayDateKey) ? " · Overdue" : ""}{work.asset.registrationStatus !== "ACTIVE" ? " · Asset registration inactive" : ""}</p>
    </Link>)}{!works.length ? <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">No PM work for this Site.</p> : null}</main>
  </AppShell>;
}
