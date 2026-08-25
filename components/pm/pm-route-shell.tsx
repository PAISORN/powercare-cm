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
  { id: "calendar", label: "Calendar", href: "/dashboardpm" },
  { id: "groups", label: "Groups", href: "/dashboardpm/groups" },
  { id: "work", label: "Work", href: "/dashboardpm/work" },
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

  return <div className="mx-auto grid max-w-6xl gap-5">
    {(scope.canSelectOrganization || scope.canSelectPlant) ? (
      <AdminSiteScopeSelector
        action={scopeAction}
        scope={scope}
        title="PM scope"
        description="Select the Organization and Site for PM planning and work."
      />
    ) : null}

    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <p className="text-sm font-bold text-[var(--primary)]">Preventive Maintenance</p>
      <h1 className="mt-2 text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Site: {scope.plant.name}</p>

      <nav aria-label="PM sections" className="mt-5 flex flex-wrap gap-2">
        {pages.filter((page) => page.id !== "groups" || canManageGroups).map((page) => {
          const active = page.id === currentPage;
          return <Link
            aria-current={active ? "page" : undefined}
            className={active
              ? "rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
              : "rounded-xl bg-[var(--soft)] px-4 py-2 text-sm font-bold text-[var(--ink)] hover:text-[var(--primary)]"
            }
            href={`${page.href}?${scopeQuery}`}
            key={page.id}
          >
            {page.label}
          </Link>;
        })}
      </nav>

      <p className="mt-6 rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)]">{description}</p>
    </section>
  </div>;
}
