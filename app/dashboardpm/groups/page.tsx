import { AlertTriangle, Plus, Save, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { PmGroupAssetPicker, type PmGroupAssetOption } from "../../../components/pm/pm-group-asset-picker";
import { PmRouteShell } from "../../../components/pm/pm-route-shell";
import { requireUser } from "../../../lib/session";
import { canManagePmGroups } from "../../../modules/auth/permission";
import {
  createPmGroup,
  deleteUnusedPmGroup,
  listEligiblePmGroupAssets,
  listPmGroups,
  setPmGroupActive,
  updatePmGroup,
} from "../../../modules/pm/pm-group-service";
import { resolvePmPageScope } from "../../../modules/pm/pm-page-scope";

type Query = { organizationId?: string; plantId?: string; saved?: string; error?: string };

async function resolveAction(formData: FormData) {
  const user = await requireUser();
  if (!canManagePmGroups(user)) redirect("/dashboardpm");
  const scope = await resolvePmPageScope(user, {
    organizationId: String(formData.get("organizationId") ?? ""),
    plantId: String(formData.get("plantId") ?? ""),
  });
  return { user, scope, serviceScope: { organizationId: scope.organization.id, plantId: scope.plant.id } };
}

function assetIds(formData: FormData) {
  return formData.getAll("assetIds").map(String);
}

async function createGroup(formData: FormData) {
  "use server";
  const { user, scope, serviceScope } = await resolveAction(formData);
  try {
    await createPmGroup(user, { ...serviceScope, code: String(formData.get("code") ?? ""), name: String(formData.get("name") ?? ""), assetIds: assetIds(formData) });
  } catch (error) { redirect(groupUrl(scope, { error: errorMessage(error) })); }
  redirect(groupUrl(scope, { saved: "created" }));
}

async function saveGroup(formData: FormData) {
  "use server";
  const { user, scope, serviceScope } = await resolveAction(formData);
  const groupId = String(formData.get("groupId") ?? "");
  try {
    await updatePmGroup(user, {
      ...serviceScope,
      groupId,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      assetIds: assetIds(formData),
    });
  } catch (error) { redirect(groupUrl(scope, { error: errorMessage(error) })); }
  redirect(groupUrl(scope, { saved: "updated" }));
}

async function changeGroupState(formData: FormData) {
  "use server";
  const { user, scope, serviceScope } = await resolveAction(formData);
  try { await setPmGroupActive(user, { ...serviceScope, groupId: String(formData.get("groupId") ?? ""), active: formData.get("active") === "true" }); }
  catch (error) { redirect(groupUrl(scope, { error: errorMessage(error) })); }
  redirect(groupUrl(scope, { saved: "state" }));
}

async function removeGroup(formData: FormData) {
  "use server";
  const { user, scope, serviceScope } = await resolveAction(formData);
  try { await deleteUnusedPmGroup(user, { ...serviceScope, groupId: String(formData.get("groupId") ?? "") }); }
  catch (error) { redirect(groupUrl(scope, { error: errorMessage(error) })); }
  redirect(groupUrl(scope, { saved: "removed" }));
}

export default async function PmGroupsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  if (!canManagePmGroups(user)) redirect("/dashboardpm");
  const query = await searchParams;
  const scope = await resolvePmPageScope(user, query);
  const serviceScope = { organizationId: scope.organization.id, plantId: scope.plant.id };
  const [groups, assets] = await Promise.all([listPmGroups(user, serviceScope), listEligiblePmGroupAssets(user, serviceScope)]);
  const options: PmGroupAssetOption[] = assets.map((asset) => ({
    id: asset.id, code: asset.code, nameTh: asset.nameTh, nameEn: asset.nameEn,
    typeName: asset.assetType?.nameTh ?? asset.assetClass.nameTh,
    zoneName: asset.zone?.name ?? null, operatingStatus: asset.operatingStatus,
  }));
  const eligibleAssetIds = new Set(options.map((asset) => asset.id));

  return <AppShell>
    <PmRouteShell canManageGroups currentPage="groups" description="Create flexible Site-level groups and choose each Asset explicitly." scope={scope} scopeAction="/dashboardpm/groups" title="PM Groups" />
    <main className="mx-auto mt-5 grid max-w-6xl gap-5">
      {query.saved ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700" role="status">PM Group saved.</p> : null}
      {query.error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700" role="alert">{query.error}</p> : null}
      <details className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-extrabold"><Plus aria-hidden="true" size={20} />Create PM Group</summary>
        <form action={createGroup} className="mt-5 grid gap-4">
          <AdminScopeHiddenFields scope={scope} />
          <div className="grid gap-4 sm:grid-cols-2"><TextField label="Code" name="code" placeholder="e.g. BOILER-PUMP" required /><TextField label="Name" name="name" placeholder="Boiler pumps" required /></div>
          <PmGroupAssetPicker assets={options} />
          <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white sm:justify-self-end" type="submit">Create group</button>
        </form>
      </details>
      <section className="grid gap-3" aria-label="PM Groups">
        {groups.map((group) => <article className={`rounded-3xl border bg-[var(--surface)] p-5 shadow-sm ${group.active ? "border-[var(--line)]" : "border-amber-500/40 opacity-80"}`} key={group.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-extrabold">{group.code} · {group.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{group.assets.length} Assets · {group.active ? "Active" : "Inactive"}{group.firstUsedAt ? " · Code locked after use" : ""}</p></div>
          {!group.assets.length ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700"><AlertTriangle size={15} />Empty group</span> : null}</div>
          <details className="mt-4"><summary className="min-h-11 cursor-pointer py-2 font-bold text-[var(--primary)]">Edit identity and membership</summary>
            <form action={saveGroup} className="mt-3 grid gap-4"><AdminScopeHiddenFields scope={scope} /><input name="groupId" type="hidden" value={group.id} />
              <div className="grid gap-4 sm:grid-cols-2"><TextField defaultValue={group.code} disabled={Boolean(group.firstUsedAt)} label="Code" name="code" required />{group.firstUsedAt ? <input name="code" type="hidden" value={group.code} /> : null}<TextField defaultValue={group.name} label="Name" name="name" required /></div>
              <PmGroupAssetPicker
                assets={options}
                defaultSelectedIds={group.assets.map((membership) => membership.assetId)}
                staleAssets={group.assets
                  .filter((membership) => !eligibleAssetIds.has(membership.assetId))
                  .map(({ asset }) => ({
                    id: asset.id,
                    code: asset.code,
                    nameTh: asset.nameTh,
                    nameEn: asset.nameEn,
                    typeName: asset.assetType?.nameTh ?? asset.assetClass.nameTh,
                    zoneName: asset.zone?.name ?? null,
                    operatingStatus: asset.operatingStatus,
                  }))}
              />
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white sm:justify-self-end"><Save size={18} />Save changes</button>
            </form>
          </details>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
            <form action={changeGroupState}><AdminScopeHiddenFields scope={scope} /><input name="groupId" type="hidden" value={group.id} /><input name="active" type="hidden" value={group.active ? "false" : "true"} /><button className="min-h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-bold">{group.active ? "Deactivate" : "Reactivate"}</button></form>
            <form action={removeGroup}><AdminScopeHiddenFields scope={scope} /><input name="groupId" type="hidden" value={group.id} /><button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/40 px-4 text-sm font-bold text-red-700"><Trash2 size={16} />{group._count.snapshots ? "Deactivate used group" : "Delete group"}</button></form>
          </div>
        </article>)}
        {!groups.length ? <p className="rounded-3xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">No PM Groups in this Site yet.</p> : null}
      </section>
    </main>
  </AppShell>;
}

function TextField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-1 text-sm font-bold"><span>{label}</span><input {...props} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60" /></label>;
}

function groupUrl(scope: { organization: { id: string }; plant: { id: string } }, message: { saved?: string; error?: string }) {
  const params = new URLSearchParams({ organizationId: scope.organization.id, plantId: scope.plant.id });
  if (message.saved) params.set("saved", message.saved);
  if (message.error) params.set("error", message.error);
  return `/dashboardpm/groups?${params}`;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Unable to save PM Group"; }
