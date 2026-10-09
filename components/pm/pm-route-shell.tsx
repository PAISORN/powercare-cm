import { CalendarDays } from "lucide-react";
import type { AdminSiteScope } from "../../modules/admin/admin-site-scope";
import { AdminSiteScopeSelector } from "../admin-site-scope-selector";

export type PmPage = "setup" | "check-sheets" | "calendar" | "groups" | "work";

type PmRouteShellProps = {
  title: string;
  description: string;
  scope: AdminSiteScope;
  currentPage: PmPage;
  canManageGroups: boolean;
  scopeAction: "/dashboardpm/setup" | "/dashboardpm/check-sheets" | "/dashboardpm" | "/dashboardpm/calendar" | "/dashboardpm/groups" | "/dashboardpm/work";
};

export function PmRouteShell({
  title,
  description,
  scope,
  currentPage,
  scopeAction,
}: PmRouteShellProps) {
  const widthClass = currentPage === "groups" ? "max-w-6xl" : "max-w-[1680px]";

  return <div className={"mx-auto grid w-full min-w-0 gap-5 " + widthClass}>
    {(scope.canSelectOrganization || scope.canSelectPlant) ? (
      <AdminSiteScopeSelector
        action={scopeAction}
        scope={scope}
        title="PM scope"
        description="Select the Organization and Site for PM planning and work."
      />
    ) : null}

    <section className="page-heading-shell min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="px-5 pb-5 pt-6 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600"><CalendarDays aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Preventive Maintenance</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="mt-1 break-words text-sm text-[var(--muted)]">Site: {scope.plant.name}</p>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-sm text-[var(--muted)]">{description}</p>
      </div>
    </section>
  </div>;
}
