import { Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { SiteAdminPermissionGroupPanel } from "../../../components/site-admin-permission-group-panel";
import { db } from "../../../lib/db";
import { cacheTags, revalidateCmData } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { SITE_ADMIN_ROLE_VALUES } from "../../../modules/cm-work/cm-work-types";
import {
  SITE_ADMIN_CONFIGURABLE_PERMISSIONS,
  SITE_ADMIN_PERMISSION_OPTIONS,
} from "../../../modules/auth/site-admin-permissions";
import { canManageSiteAdminPermissions } from "../../../modules/auth/permission";
import { readOrganizationScope } from "../../../modules/organization/organization-scope-service";

async function updateSiteAdminPermissions(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageSiteAdminPermissions(current)) redirect("/dashboard");

  const userId = String(formData.get("userId") ?? "");
  const plantId = String(formData.get("plantId") ?? "");
  const returnPlantId = String(formData.get("returnPlantId") ?? "");
  const returnOrganizationId = String(formData.get("returnOrganizationId") ?? "");
  const organizationId = await resolveActionOrganizationId(returnOrganizationId);
  if (!userId || !plantId) redirect(siteAdminPermissionsPath("error", returnPlantId, returnOrganizationId));

  const target = await db.user.findFirst({
    where: { id: userId, organizationId, role: { in: [...SITE_ADMIN_ROLE_VALUES] }, plantId },
    select: { id: true, fullName: true, username: true, plantId: true },
  });
  if (!target) redirect(siteAdminPermissionsPath("error", returnPlantId, returnOrganizationId));

  const selected = new Set(formData.getAll("permissionKey").map((value) => String(value)));
  const before = await db.siteAdminPermission.findMany({
    where: { userId, plantId },
    select: { permissionKey: true, enabled: true },
    orderBy: { permissionKey: "asc" },
  });

  await db.$transaction(
    SITE_ADMIN_CONFIGURABLE_PERMISSIONS.map((permissionKey) =>
      db.siteAdminPermission.upsert({
        where: { userId_plantId_permissionKey: { userId, plantId, permissionKey } },
        update: {
          enabled: selected.has(permissionKey),
          grantedById: current.id,
        },
        create: {
          userId,
          plantId,
          permissionKey,
          enabled: selected.has(permissionKey),
          grantedById: current.id,
        },
      }),
    ),
  );

  await recordAudit({
    actorId: current.id,
    organizationId,
    plantId,
    entityType: "SiteAdminPermission",
    entityId: userId,
    action: "UPDATE_SITE_ADMIN_PERMISSIONS",
    before: { permissions: before },
    after: { permissions: [...selected] },
  });

  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect(siteAdminPermissionsPath("saved", returnPlantId, returnOrganizationId));
}

async function updateSiteQuota(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageSiteAdminPermissions(current)) redirect("/dashboard");
  const plantId = String(formData.get("plantId") ?? "");
  const returnPlantId = String(formData.get("returnPlantId") ?? "");
  const returnOrganizationId = String(formData.get("returnOrganizationId") ?? "");
  const organizationId = await resolveActionOrganizationId(returnOrganizationId);
  const maxUsers = normalizeLimit(formData.get("maxUsers"));
  const maxWorkRequests = normalizeLimit(formData.get("maxWorkRequests"));

  const before = await db.plant.findFirstOrThrow({
    where: { id: plantId, organizationId },
    select: { id: true, maxUsers: true, maxWorkRequests: true },
  });
  const updated = await db.plant.update({
    where: { id: before.id },
    data: { maxUsers, maxWorkRequests },
    select: { id: true, maxUsers: true, maxWorkRequests: true },
  });

  await recordAudit({
    actorId: current.id,
    organizationId,
    plantId,
    entityType: "Plant",
    entityId: plantId,
    action: "UPDATE_SITE_QUOTA",
    before,
    after: updated,
  });
  revalidateCmData([cacheTags.plants, cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect(siteAdminPermissionsPath("saved", returnPlantId, returnOrganizationId));
}

export default async function SiteAdminPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; organizationId?: string; plantId?: string }>;
}) {
  const current = await requireUser();
  if (!canManageSiteAdminPermissions(current)) redirect("/dashboard");
  const scope = await readOrganizationScope();
  const query = await searchParams;
  const organizations = await db.organization.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  const organizationId = normalizeOrganizationId(query.organizationId, organizations, scope.organization.id);
  const selectedPlantId = typeof query.plantId === "string" ? query.plantId : "";
  const selectedPlant = selectedPlantId
    ? await db.plant.findFirst({
        where: { id: selectedPlantId, organizationId },
        select: { id: true, code: true, name: true },
      })
    : null;
  if (selectedPlantId && !selectedPlant) redirect("/admin/site-admin-permissions");

  const allPlants = await db.plant.findMany({
    where: { organizationId },
    select: { id: true, code: true, name: true, active: true, maxUsers: true, maxWorkRequests: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const plantsForPermissions = await db.plant.findMany({
    where: {
      organizationId,
      ...(selectedPlant ? { id: selectedPlant.id } : {}),
    },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  const plantIdsForPermissions = plantsForPermissions.map((plant) => plant.id);

  const siteAdmins = await db.user.findMany({
    where: {
      organizationId,
      role: { in: [...SITE_ADMIN_ROLE_VALUES] },
      active: true,
      ...(selectedPlant
        ? { plantId: selectedPlant.id }
        : { OR: [{ plantId: { in: plantIdsForPermissions } }, { plantId: null }] }),
    },
    include: {
      plant: true,
      siteAdminPermissions: true,
    },
    orderBy: [{ plantId: "asc" }, { fullName: "asc" }],
  });
  const groupedOptions = groupPermissionOptions();
  const unassignedCount = siteAdmins.filter((siteAdmin) => !siteAdmin.plantId).length;
  const enabledGrantCount = siteAdmins.reduce(
    (sum, siteAdmin) => sum + siteAdmin.siteAdminPermissions.filter((permission) => permission.enabled).length,
    0,
  );

  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
            <ShieldCheck aria-hidden="true" size={17} />
            Owner Admin Control
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">Site Admin Permissions</h1>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">
            Owner Admin เป็นผู้เปิดหรือปิดสิทธิ์ของ Site Admin แต่ละ Site เท่านั้น เพื่อกันการให้สิทธิ์กว้างเกินขอบเขต
          </p>
        </div>
        {selectedPlant ? (
          <Link
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--soft)]"
            href="/admin/site-admin-permissions"
          >
            Show all Sites
          </Link>
        ) : null}
      </header>

      {selectedPlant ? (
        <section className="mt-5 rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5">
          <p className="text-sm font-semibold text-[var(--primary)]">Selected Site</p>
          <h2 className="mt-1 text-2xl font-extrabold">{selectedPlant.name}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Code: {selectedPlant.code}</p>
        </section>
      ) : null}

      <section className="mt-5 grid gap-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] lg:grid-cols-[1fr_auto] lg:items-end">
        <form className="grid gap-3 md:grid-cols-[minmax(220px,340px)_minmax(220px,420px)_auto_auto] md:items-end">
          <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">
            Organization
            <AutoSubmitSelect
              className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]"
              defaultValue={organizationId}
              name="organizationId"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--muted)]">
            Filter Site
            <AutoSubmitSelect name="plantId"
              className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]"
              defaultValue={selectedPlant?.id ?? ""}
            >
              <option value="">All Sites</option>
              {allPlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name} ({plant.code}){plant.active ? "" : " - inactive"}
                </option>
              ))}
            </AutoSubmitSelect>
          </label>
          <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
            Apply
          </button>
          <Link
            className="grid min-h-12 place-items-center rounded-2xl border border-[var(--line)] px-5 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--soft)]"
            href="/admin/site-admin-permissions"
          >
            Clear
          </Link>
        </form>
        <div className="grid gap-2 text-sm font-semibold text-[var(--muted)] sm:grid-cols-3 lg:min-w-[420px]">
          <span className="rounded-2xl bg-[var(--soft)] px-4 py-3">
            Site Admins <strong className="text-[var(--ink)]">{siteAdmins.length}</strong>
          </span>
          <span className="rounded-2xl bg-[var(--soft)] px-4 py-3">
            Enabled grants <strong className="text-[var(--ink)]">{enabledGrantCount}</strong>
          </span>
          <span className="rounded-2xl bg-[var(--soft)] px-4 py-3">
            Unassigned <strong className="text-[var(--ink)]">{unassignedCount}</strong>
          </span>
        </div>
      </section>

      {query.saved === "1" ? (
        <p className="mt-5 rounded-2xl border border-green-500/35 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          บันทึกสิทธิ์ Site Admin เรียบร้อยแล้ว
        </p>
      ) : null}
      {query.error === "1" ? (
        <p className="mt-5 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          บันทึกไม่สำเร็จ กรุณาตรวจสอบว่า Site Admin มีการผูก Site แล้ว
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">Site Quotas</p>
            <h2 className="text-xl font-extrabold">User and request limits</h2>
          </div>
          <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-semibold text-[var(--muted)]">Blank = Unlimited</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {allPlants.map((plant) => (
            <form
              key={plant.id}
              action={updateSiteQuota}
              className="site-quota-form-grid grid min-w-0 gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(130px,160px)_minmax(130px,170px)_auto] xl:items-end"
            >
              <input name="plantId" type="hidden" value={plant.id} />
              <input name="returnPlantId" type="hidden" value={selectedPlant?.id ?? ""} />
              <input name="returnOrganizationId" type="hidden" value={organizationId} />
              <div className="min-w-0 md:col-span-2 xl:col-span-1">
                <p className="truncate font-extrabold" title={plant.name}>{plant.name}</p>
                <p className="text-sm text-[var(--muted)]">{plant.code}</p>
              </div>
              <label className="grid gap-1 text-sm font-semibold">
                Max users
                <input className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" min="1" name="maxUsers" placeholder="Unlimited" type="number" defaultValue={plant.maxUsers ?? ""} />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Max requests
                <input className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" min="1" name="maxWorkRequests" placeholder="Unlimited" type="number" defaultValue={plant.maxWorkRequests ?? ""} />
              </label>
              <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white md:w-fit xl:w-auto" type="submit">
                Save
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-5">
        {siteAdmins.length ? (
          siteAdmins.map((siteAdmin) => {
            const enabledPermissions = new Set(
              siteAdmin.siteAdminPermissions
                .filter((permission) => permission.enabled)
                .map((permission) => permission.permissionKey),
            );
            const disabled = !siteAdmin.plantId;

            return (
              <article key={siteAdmin.id} className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold">{siteAdmin.fullName}</h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {siteAdmin.username} · Site: {siteAdmin.plant?.name ?? "ยังไม่ผูก Site"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-semibold text-[var(--muted)]">
                    {enabledPermissions.size}/{SITE_ADMIN_CONFIGURABLE_PERMISSIONS.length} enabled
                  </span>
                </div>

                <form action={updateSiteAdminPermissions} className="mt-5 grid gap-5">
                  <input name="userId" type="hidden" value={siteAdmin.id} />
                  <input name="plantId" type="hidden" value={siteAdmin.plantId ?? ""} />
                  <input name="returnPlantId" type="hidden" value={selectedPlant?.id ?? ""} />
                  <input name="returnOrganizationId" type="hidden" value={organizationId} />
                  {disabled ? (
                    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      Site Admin คนนี้ยังไม่ผูก Site จึงยังตั้งค่าสิทธิ์ไม่ได้
                      <Link className="ml-2 underline underline-offset-4" href="/admin/users">
                        Manage user site
                      </Link>
                    </p>
                  ) : null}

                  <div className="grid gap-4 xl:grid-cols-2">
                    {groupedOptions.map((group) => {
                      const enabledCount = group.options.filter((option) => enabledPermissions.has(option.key)).length;

                      return (
                        <SiteAdminPermissionGroupPanel
                          key={group.name}
                          disabled={disabled}
                          enabledCount={enabledCount}
                          enabledPermissionKeys={group.options.filter((option) => enabledPermissions.has(option.key)).map((option) => option.key)}
                          groupName={group.name}
                          options={group.options}
                        />
                      );
                    })}
                  </div>

                  <button
                    className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={disabled}
                    type="submit"
                  >
                    <Save aria-hidden="true" size={18} />
                    บันทึกสิทธิ์
                  </button>
                </form>
              </article>
            );
          })
        ) : (
          <p className="rounded-3xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
             ยังไม่มี Site Admin ในระบบ
          </p>
        )}
      </section>
    </AppShell>
  );
}

function groupPermissionOptions() {
  const groups = new Map<string, typeof SITE_ADMIN_PERMISSION_OPTIONS>();
  for (const option of SITE_ADMIN_PERMISSION_OPTIONS) {
    groups.set(option.group, [...(groups.get(option.group) ?? []), option]);
  }
  return [...groups.entries()].map(([name, options]) => ({ name, options }));
}

function siteAdminPermissionsPath(status: "saved" | "error", plantId?: string, organizationId?: string) {
  const params = new URLSearchParams(status === "saved" ? { saved: "1" } : { error: "1" });
  if (organizationId) params.set("organizationId", organizationId);
  if (plantId) params.set("plantId", plantId);
  return `/admin/site-admin-permissions?${params.toString()}`;
}

function normalizeOrganizationId(
  organizationId: string | undefined,
  organizations: { id: string }[],
  fallbackOrganizationId: string,
) {
  if (organizationId && organizations.some((organization) => organization.id === organizationId)) return organizationId;
  if (organizations.some((organization) => organization.id === fallbackOrganizationId)) return fallbackOrganizationId;
  return organizations[0]?.id ?? fallbackOrganizationId;
}

async function resolveActionOrganizationId(organizationId: string) {
  const scope = await readOrganizationScope();
  const selected = organizationId || scope.organization.id;
  const organization = await db.organization.findFirst({
    where: { id: selected, active: true },
    select: { id: true },
  });
  return organization?.id ?? scope.organization.id;
}

function normalizeLimit(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
