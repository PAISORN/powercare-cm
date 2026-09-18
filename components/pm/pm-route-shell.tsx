import { CalendarDays, ClipboardList, Layers3 } from "lucide-react";
import Link from "next/link";
import type { AdminSiteScope } from "../../modules/admin/admin-site-scope";
import { AdminSiteScopeSelector } from "../admin-site-scope-selector";

export type PmPage = "calendar" | "groups" | "work";

type PmRouteShellProps = {
  title: string;
  description: string;
  scope: AdminSiteScope;
  currentPage: PmPage;
  canManageGroups: boolean;
  scopeAction: "/dashboardpm" | "/dashboardpm/groups" | "/dashboardpm/work";
};

const pages = [
  { id: "calendar", label: "Calendar", href: "/dashboardpm", icon: CalendarDays },
  { id: "groups", label: "Groups", href: "/dashboardpm/groups", icon: Layers3 },
  { id: "work", label: "Work", href: "/dashboardpm/work", icon: ClipboardList },
] as const;

export function PmRouteShell({
  title,
  description,
  scope,
  currentPage,
  canManageGroups,
  scopeAction,
}: PmRouteShellProps) {
  const scopeQuery = new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  }).toString();
  const widthClass = currentPage === "calendar" ? "max-w-[1680px]" : "max-w-6xl";

  return <div className={"mx-auto grid w-full gap-5 " + widthClass}>
    {(scope.canSelectOrganization || scope.canSelectPlant) ? (
      <AdminSiteScopeSelector
        action={scopeAction}
        scope={scope}
        title="PM scope"
        description="Select the Organization and Site for PM planning and work."
      />
    ) : null}

    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="px-5 pb-5 pt-6 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600"><CalendarDays aria-hidden="true" size={20} /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Preventive Maintenance</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Site: {scope.plant.name}</p>
          </div>
        </div>
        <p className="mt-4 max-w-4xl text-sm text-[var(--muted)]">{description}</p>
      </div>

      <nav aria-label="PM sections" className="flex min-w-0 gap-1 overflow-x-auto border-t border-[var(--line)] px-3 sm:px-5">
        {pages.filter((page) => page.id !== "groups" || canManageGroups).map((page) => {
          const active = page.id === currentPage;
          const Icon = page.icon;
          return <Link
            aria-current={active ? "page" : undefined}
            className={"relative inline-flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-4 " + (active ? "text-[var(--ink)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]")}
            href={page.href + "?" + scopeQuery}
            key={page.id}
          >
            <Icon aria-hidden="true" size={17} />
            {page.label}
          </Link>;
        })}
      </nav>
    </section>
  </div>;
}