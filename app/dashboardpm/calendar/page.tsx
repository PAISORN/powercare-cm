import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AdminScopeHiddenFields,
  AdminSiteScopeSelector,
} from "../../../components/admin-site-scope-selector";
import { PmCalendar } from "../../../components/pm/pm-calendar";
import { PmCalendarViewSwitcher } from "../../../components/pm/pm-calendar-view-switcher";
import { PmAnnualReleasePanel } from "../../../components/pm/pm-annual-release-panel";
import { PmConfirmedPlanEditor } from "../../../components/pm/pm-confirmed-plan-editor";
import { PmDayColumn } from "../../../components/pm/pm-day-column";
import { PmPlanEditor } from "../../../components/pm/pm-plan-editor";
import { getBangkokDateString } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { canExecutePmWork, canManagePmPlans, canViewPm } from "../../../modules/auth/permission";
import { loadPmCalendarPageData } from "../../../modules/pm/pm-calendar-page-data";
import {
  resolvePmCalendarPageState,
  type PmCalendarQuery,
} from "../../../modules/pm/pm-calendar-page-model";
import { resolvePmPageScope } from "../../../modules/pm/pm-page-scope";
import { listEligiblePmAssignees } from "../../../modules/pm/pm-work-service";
import {
  addConfirmedAsset,
  addGroup,
  cancelConfirmed,
  confirmPlan,
  createPlan,
  deletePlan,
  releaseAnnual,
  removeGroup,
  reschedule,
  rescheduleConfirmed,
} from "../actions";

export default async function PmCalendarPage({
  searchParams,
}: {
  searchParams: Promise<PmCalendarQuery>;
}) {
  const user = await requireUser();
  if (!canViewPm(user)) redirect("/dashboardcm");
  const query = await searchParams;
  const scope = await resolvePmPageScope(user, query);
  const today = getBangkokDateString();
  const { selectedDate, view, month } = resolvePmCalendarPageState(
    query,
    today,
  );
  const canManage = canManagePmPlans(user);
  const canExecute = canExecutePmWork(user);
  const {
    serviceScope,
    scopeQuery,
    plans,
    groups,
    annualEntries,
    annualPlan,
    annualPreview,
    annualPreviewError,
    selectedPlanId,
    plan,
    preview,
    confirmedAssets,
    selectedAnnualEntries,
  } = await loadPmCalendarPageData({
    user,
    scope,
    query,
    month,
    selectedDate,
    canManage,
    canExecute,
  });
  const eligibleAssignees =
    annualPreview && (canManage || canExecute)
      ? await listEligiblePmAssignees(user, serviceScope)
      : [];
  return (
    <>
      <div className="mx-auto grid w-full max-w-[1680px] gap-5">
        {scope.canSelectOrganization || scope.canSelectPlant ? (
          <AdminSiteScopeSelector
            action="/dashboardpm/calendar"
            description="เลือก Organization และ Site สำหรับดู PM Calendar"
            scope={scope}
            title="PM scope"
          />
        ) : null}
        <main className="grid min-w-0 gap-5">
          {query.saved ? (
            <p
              className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700"
              role="status"
            >
              บันทึกแผน PM แล้ว
            </p>
          ) : null}
          {query.error ? (
            <p
              className="rounded-2xl bg-red-500/10 p-4 text-sm font-bold text-red-700"
              role="alert"
            >
              {query.error}
            </p>
          ) : null}
          {(annualPreview || annualPreviewError) &&
          (canManage || canExecute) &&
          query.release === "annual" ? (
            <>
              <Link
                aria-hidden="true"
                className="fixed inset-0 z-[80] bg-[#6685be]/55 backdrop-blur-[5px]"
                href={
                  "/dashboardpm/calendar?" +
                  scopeQuery +
                  "&view=" +
                  view +
                  "&month=" +
                  month.slice(0, 7) +
                  "&date=" +
                  selectedDate
                }
                scroll={false}
                tabIndex={-1}
              />
              <aside
                aria-label="เริ่มดำเนินการ PM"
                aria-modal="true"
                className="fixed inset-0 z-[90] m-auto flex flex-col overflow-visible rounded-[2.75rem] bg-white text-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.32)]"
                data-pm-annual-release-dialog
                role="dialog"
                style={{
                  height: "fit-content",
                  maxHeight: "90dvh",
                  width: "min(calc(100vw - 2rem), 460px)",
                }}
              >
                <Link
                  aria-label="ปิดหน้าต่างเริ่มดำเนินการ PM"
                  className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center text-3xl font-black leading-none text-slate-500 transition hover:scale-110 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 sm:right-5 sm:top-5"
                  href={
                    "/dashboardpm/calendar?" +
                    scopeQuery +
                    "&view=" +
                    view +
                    "&month=" +
                    month.slice(0, 7) +
                    "&date=" +
                    selectedDate
                  }
                  scroll={false}
                >
                  <span aria-hidden="true">×</span>
                </Link>
                <header className="px-6 pb-1 pr-16 pt-7 sm:px-8 sm:pr-20 sm:pt-8">
                  <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
                    Annual PM
                  </h2>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-b-[2.75rem] px-6 pb-6 pt-2 sm:px-8 sm:pb-7">
                  {query.error ? (
                    <p
                      className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
                      role="alert"
                    >
                      {query.error}
                    </p>
                  ) : null}
                  {annualPreviewError ? (
                    <p
                      className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800"
                      role="alert"
                    >
                      {annualPreviewError}
                    </p>
                  ) : annualPreview ? (
                    <PmAnnualReleasePanel
                      action={releaseAnnual}
                      activatesDraft={annualPlan?.status === "DRAFT"}
                      calendarView={view}
                      organizationId={scope.organization.id}
                      plantId={scope.plant.id}
                      planId={annualPlan!.id}
                      positionKey={
                        "pm-release:" + scope.plant.id + ":" + selectedDate
                      }
                      preview={annualPreview}
                      users={eligibleAssignees.map((assignee) => ({
                        id: assignee.id,
                        fullName: assignee.fullName,
                        role: assignee.role,
                        hasPhoto: Boolean(assignee.profilePhoto),
                        photoVersion: assignee.profilePhoto?.updatedAt.getTime(),
                      }))}
                    />
                  ) : null}
                </div>
              </aside>
            </>
          ) : null}
          {view === "day" ? (
            <PmCalendarViewSwitcher
              view={view}
              monthHref={`/dashboardpm/calendar?${scopeQuery}&view=month&month=${month.slice(0, 7)}&date=${selectedDate}`}
              dayHref={`/dashboardpm/calendar?${scopeQuery}&view=day&month=${selectedDate.slice(0, 7)}&date=${selectedDate}${selectedPlanId ? `&planId=${selectedPlanId}` : ""}`}
            />
          ) : null}
          <div className="grid min-w-0 gap-5">
            <div className="min-w-0">
              {view === "month" ? (
                <PmCalendar
                  annualEntries={annualEntries}
                  canManage={canManage}
                  canExecute={canExecute}
                  month={month}
                  plans={plans}
                  scopeQuery={scopeQuery}
                  today={today}
                  viewSwitcher={{
                    view,
                    monthHref: `/dashboardpm/calendar?${scopeQuery}&view=month&month=${month.slice(0, 7)}&date=${selectedDate}`,
                    dayHref: `/dashboardpm/calendar?${scopeQuery}&view=day&month=${selectedDate.slice(0, 7)}&date=${selectedDate}${selectedPlanId ? `&planId=${selectedPlanId}` : ""}`,
                  }}
                />
              ) : (
                <PmDayColumn
                  annualEntries={annualEntries.filter(
                    (item) => item.scheduleDateKey === selectedDate,
                  )}
                  canManage={canManage}
                  canExecute={canExecute}
                  date={selectedDate}
                  plan={plans.find(
                    (item) => item.plannedDateKey === selectedDate,
                  )}
                  scopeQuery={scopeQuery}
                  today={today}
                />
              )}
            </div>
            {plan && preview ? (
              <PmPlanEditor
                actions={{
                  add: addGroup,
                  remove: removeGroup,
                  reschedule,
                  deletePlan,
                  confirm: confirmPlan,
                }}
                calendarView={view}
                canManage={canManage}
                groups={groups}
                plan={plan}
                preview={preview}
                scope={serviceScope}
              />
            ) : plan?.status === "CONFIRMED" && canManage ? (
              <PmConfirmedPlanEditor
                actions={{
                  addAsset: addConfirmedAsset,
                  reschedule: rescheduleConfirmed,
                  cancel: cancelConfirmed,
                }}
                assets={confirmedAssets}
                calendarView={view}
                plan={plan}
                scope={serviceScope}
              />
            ) : plan ? (
              <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
                <p className="text-sm font-bold text-[var(--primary)]">
                  แผน PM
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {plan.number ?? plan.plannedDateKey}
                </h2>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  สถานะ {plan.status}
                </p>
              </section>
            ) : view === "day" && canManage && !selectedAnnualEntries.length ? (
              <form action={createPlan}>
                <AdminScopeHiddenFields scope={scope} />
                <input name="calendarView" type="hidden" value={view} />
                <input
                  name="plannedDateKey"
                  type="hidden"
                  value={selectedDate}
                />
                <input
                  name="submissionKey"
                  type="hidden"
                  value={randomUUID()}
                />
                <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-4 font-bold text-white">
                  สร้าง Draft สำหรับวันนี้
                </button>
              </form>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
}
