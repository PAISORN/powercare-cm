import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminStructureTabs } from "../../../components/admin-structure-tabs";
import { AppShell } from "../../../components/app-shell";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { db } from "../../../lib/db";
import { cacheTags, revalidateCmData } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import { canManageSites } from "../../../modules/auth/permission";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName, SITE_ADMIN_ROLE_VALUES } from "../../../modules/cm-work/cm-work-types";
import { initialCategories, initialZones } from "../../../modules/master-data/seed-data";
import { DEFAULT_ORGANIZATION_ID, normalizePlantRecordInput } from "../../../modules/organization/organization-foundation";

async function createSite(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageSites(user)) redirect("/dashboard");
  const organization = await resolveManageableOrganization(user, String(formData.get("organizationId") ?? ""));
  const site = normalizePlantRecordInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
  });

  const existing = await db.plant.findFirst({
    where: {
      organizationId: organization.id,
      OR: [{ code: site.code }, { name: site.name }],
    },
    select: { id: true },
  });
  if (existing) redirect(siteListPath("duplicate", user.role, organization.id));

  const created = await db.plant.create({
    data: {
      organizationId: organization.id,
      code: site.code,
      name: site.name,
      active: true,
    },
  });
  await db.zone.createMany({
    data: initialZones.map((name) => ({
      name,
      plantId: created.id,
      active: true,
    })),
  });
  await db.category.createMany({
    data: initialCategories.map((name) => ({
      name,
      organizationId: organization.id,
      plantId: created.id,
      active: true,
    })),
  });

  await recordAudit({
    actorId: user.id,
    organizationId: organization.id,
    plantId: created.id,
    entityType: "Plant",
    entityId: created.id,
    action: "CREATE_SITE",
    after: { name: created.name, code: created.code, active: created.active, defaultCategories: initialCategories, defaultZones: initialZones },
  });
  revalidateCmData([cacheTags.plants, cacheTags.dashboardSummary]);
  redirect(siteListPath("success", user.role, organization.id));
}

async function setSiteActive(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageSites(user)) redirect("/dashboard");
  const organization = await resolveManageableOrganization(user, String(formData.get("organizationId") ?? ""));
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  const before = await db.plant.findFirstOrThrow({
    where: { id, organizationId: organization.id },
    include: { _count: { select: { users: true, works: true, zones: true } } },
  });
  const site = await db.plant.update({ where: { id }, data: { active } });

  await recordAudit({
    actorId: user.id,
    organizationId: organization.id,
    plantId: site.id,
    entityType: "Plant",
    entityId: site.id,
    action: active ? "ACTIVATE_SITE" : "DEACTIVATE_SITE",
    before: { name: before.name, code: before.code, active: before.active },
    after: { name: site.name, code: site.code, active: site.active },
  });
  revalidateCmData([cacheTags.plants, cacheTags.dashboardSummary]);
  redirect(siteListPath(undefined, user.role, organization.id));
}

async function updateSiteDetails(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageSites(user)) redirect("/dashboard");
  const organization = await resolveManageableOrganization(user, String(formData.get("organizationId") ?? ""));
  const id = String(formData.get("id") ?? "");
  const site = normalizePlantRecordInput({
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
  const maxUsers = normalizeLimit(formData.get("maxUsers"));
  const maxWorkRequests = normalizeLimit(formData.get("maxWorkRequests"));
  const before = await db.plant.findFirstOrThrow({
    where: { id, organizationId: organization.id },
    select: { id: true, name: true, code: true, maxUsers: true, maxWorkRequests: true },
  });
  const duplicate = await db.plant.findFirst({
    where: {
      organizationId: organization.id,
      id: { not: id },
      OR: [{ name: site.name }, { code: site.code }],
    },
    select: { id: true },
  });
  if (duplicate) redirect(siteListPath("duplicate", user.role, organization.id));

  const updated = await db.plant.update({
    where: { id },
    data: { name: site.name, code: site.code, maxUsers, maxWorkRequests },
  });
  await recordAudit({
    actorId: user.id,
    organizationId: organization.id,
    plantId: updated.id,
    entityType: "Plant",
    entityId: updated.id,
    action: "UPDATE_SITE_DETAILS",
    before,
    after: { name: updated.name, code: updated.code, maxUsers: updated.maxUsers, maxWorkRequests: updated.maxWorkRequests },
  });
  revalidateCmData([cacheTags.plants, cacheTags.dashboardSummary, cacheTags.usersActive]);
  redirect(siteListPath("updated", user.role, organization.id));
}

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{ createStatus?: string; organizationId?: string }>;
}) {
  const user = await requireUser();
  if (!canManageSites(user)) redirect("/dashboard");
  const query = await searchParams;
  const organizations = user.role === RoleName.ADMIN
    ? await db.organization.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const organization = await resolveManageableOrganization(user, query.organizationId ?? "", organizations);
  const sites = await db.plant.findMany({
    where: { organizationId: organization.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true, works: true, zones: true } } },
  });
  const siteAdminCounts = await db.user.groupBy({
    by: ["plantId"],
    where: {
      organizationId: organization.id,
      role: { in: [...SITE_ADMIN_ROLE_VALUES] },
      plantId: { not: null },
      active: true,
    },
    _count: { _all: true },
  });
  const siteAdminCountByPlantId = new Map<string, number>();
  for (const row of siteAdminCounts) {
    if (row.plantId) siteAdminCountByPlantId.set(row.plantId, row._count._all);
  }

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-[var(--primary)]">Owner Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold">Sites</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage site records for {organization.name}. Each site can later have its own Site Admin, QR link, zones, users, and CM work.
        </p>
      </section>

      <AdminStructureTabs activeTab="sites" />

      {user.role === RoleName.ADMIN ? (
        <form className="mt-6 grid gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-1 text-sm font-semibold">
            Organization
            <AutoSubmitSelect name="organizationId" defaultValue={organization.id} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </AutoSubmitSelect>
          </label>
          <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white" type="submit">
            Filter
          </button>
        </form>
      ) : null}

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <h2 className="text-xl font-bold">Create Site</h2>
        {query.createStatus === "duplicate" ? (
          <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
            This site code or name already exists in this organization.
          </p>
        ) : null}
        {query.createStatus === "success" ? (
          <p className="mt-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-700 dark:text-green-300">
            Site created successfully.
          </p>
        ) : null}
        {query.createStatus === "updated" ? (
          <p className="mt-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-700 dark:text-green-300">
            Site updated successfully.
          </p>
        ) : null}
        <form aria-label="Create site" action={createSite} className="mt-5 grid gap-3 md:grid-cols-[minmax(180px,260px)_1fr_1fr_auto]">
          {user.role === RoleName.ADMIN ? (
            <label className="grid gap-1 text-sm font-semibold" data-create-site-organization>
              Create this Site under
              <select name="organizationId" defaultValue={organization.id} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                {organizations.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <input name="organizationId" type="hidden" value={organization.id} />
          )}
          <label className="grid gap-1 text-sm font-semibold">
            Site name
            <input name="name" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" placeholder="Rungtiva Biomass" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Site code
            <input name="code" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" placeholder="rungtiva-main" />
          </label>
          <button className="self-end rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white" type="submit">
            Add Site
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Site List</h2>
          <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-semibold text-[var(--muted)]">{sites.length} sites</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <article id={`site-${site.id}`} key={site.id} className="scroll-mt-28 grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
              <form action={updateSiteDetails} className="grid gap-3">
                <input name="id" type="hidden" value={site.id} />
                <input name="organizationId" type="hidden" value={organization.id} />
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold">{site.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${site.active ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-slate-500/15 text-slate-600 dark:text-slate-300"}`}>
                    {site.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">Code: {site.code}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-[var(--muted)]">
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1">Users {site._count.users}</span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1">Site Admins {siteAdminCountByPlantId.get(site.id) ?? 0}</span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1">Works {site._count.works}</span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1">Zones {site._count.zones}</span>
                </div>
                <label className="grid gap-1 text-sm font-semibold">
                  Site name
                  <input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" name="name" defaultValue={site.name} required />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Site code
                  <input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" name="code" defaultValue={site.code} required />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Max users
                    <input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" min="1" name="maxUsers" placeholder="Unlimited" type="number" defaultValue={site.maxUsers ?? ""} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Max requests
                    <input className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" min="1" name="maxWorkRequests" placeholder="Unlimited" type="number" defaultValue={site.maxWorkRequests ?? ""} />
                  </label>
                </div>
                <button className="rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
                  Save Site
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]"
                  href={`/admin/site-admin-permissions?organizationId=${organization.id}&plantId=${site.id}`}
                >
                  Manage Site Admins
                </Link>
                <form action={setSiteActive}>
                  <input name="id" type="hidden" value={site.id} />
                  <input name="organizationId" type="hidden" value={organization.id} />
                  <input name="active" type="hidden" value={site.active ? "false" : "true"} />
                  <button className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold">
                    {site.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function normalizeLimit(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function resolveManageableOrganization(
  user: { role: string; organizationId?: string | null },
  requestedOrganizationId: string,
  prefetchedOrganizations?: { id: string; name: string; slug: string }[],
) {
  if (user.role === RoleName.ADMIN) {
    const organizations = prefetchedOrganizations ?? await db.organization.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    const selected = organizations.find((organization) => organization.id === requestedOrganizationId)
      ?? organizations.find((organization) => organization.id === user.organizationId)
      ?? organizations[0];
    if (!selected) redirect("/admin/users");
    return selected;
  }

  const organizationId = user.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const organization = await db.organization.findFirst({
    where: { id: organizationId, active: true },
    select: { id: true, name: true, slug: true },
  });
  if (!organization) redirect("/dashboard");
  return organization;
}

function siteListPath(status: "success" | "updated" | "duplicate" | undefined, role: string, organizationId: string) {
  const params = new URLSearchParams();
  if (status) params.set("createStatus", status);
  if (role === RoleName.ADMIN) params.set("organizationId", organizationId);
  const query = params.toString();
  return query ? `/admin/sites?${query}` : "/admin/sites";
}
