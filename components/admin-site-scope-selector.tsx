import { Building2, Factory } from "lucide-react";
import { AutoSubmitSelect } from "./auto-submit-select";
import type { AdminSiteScope } from "../modules/admin/admin-site-scope";

type AdminSiteScopeSelectorProps = {
  action?: string;
  compact?: boolean;
  unframed?: boolean;
  scope: AdminSiteScope;
  title?: string;
  description?: string;
};

export function AdminSiteScopeSelector({
  action,
  compact = false,
  unframed = false,
  scope,
  title = "Site scope",
  description = "เลือก Organization และ Site ที่ต้องการจัดการ",
}: AdminSiteScopeSelectorProps) {
  const locked = !scope.canSelectOrganization && !scope.canSelectPlant;

  return (
    <section className={unframed
      ? "border-t border-[var(--line)] px-4 py-4 sm:px-5"
      : "rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
    }>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
            <Factory aria-hidden="true" size={16} />
            {title}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        </div>
        {locked ? (
          <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
            Locked to your Site
          </span>
        ) : null}
      </div>

      <form
        action={action}
        className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] md:items-end"}`}
        method="get"
      >
        <label className="grid gap-1 text-sm font-semibold">
          <span className="flex items-center gap-2 text-[var(--muted)]">
            <Building2 aria-hidden="true" size={15} />
            Organization
          </span>
          {scope.canSelectOrganization ? (
            <AutoSubmitSelect className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)]" defaultValue={scope.organization.id} name="organizationId">
              {scope.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </AutoSubmitSelect>
          ) : (
            <span className="flex min-h-12 items-center rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)]">
              {scope.organization.name}
            </span>
          )}
        </label>

        <label className="grid gap-1 text-sm font-semibold">
          <span className="flex items-center gap-2 text-[var(--muted)]">
            <Factory aria-hidden="true" size={15} />
            Site
          </span>
          {scope.canSelectPlant ? (
            <AutoSubmitSelect className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)]" defaultValue={scope.plant.id} name="plantId">
              {scope.plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </AutoSubmitSelect>
          ) : (
            <span className="flex min-h-12 items-center rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)]">
              {scope.plant.name}
            </span>
          )}
        </label>

        {locked ? null : (
          <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]" type="submit">
            Apply
          </button>
        )}
      </form>
    </section>
  );
}

export function AdminScopeHiddenFields({ scope }: { scope: AdminSiteScope }) {
  return (
    <>
      <input name="organizationId" type="hidden" value={scope.organization.id} />
      <input name="plantId" type="hidden" value={scope.plant.id} />
    </>
  );
}
