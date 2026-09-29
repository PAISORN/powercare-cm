import Link from "next/link";
import { CircleUserRound, KeyRound, PlusCircle, Upload, X } from "lucide-react";
import { AdminUserRoleScopeController } from "../admin-user-role-scope-controller";
import { ProfilePhotoPreview } from "../profile-photo-preview";
import { UserAvatar } from "../user-avatar";
import { InventoryUserScopeFields } from "../inventory-user-scope-fields";
import { RoleName } from "../../modules/cm-work/cm-work-types";
import {
  formatOrgUserCategories,
  formatRoleNameForChart,
  getAssetVersion,
  getUserCategoryIds,
  type ChartUser,
  type CreateUserContext,
  type OrganizationOption,
  type RoleOption,
  type ScopeOption,
  type UserPermissions,
} from "./organization-site-map-model";
export function OrganizationUserDrawer({
  action,
  categories,
  onClose,
  open,
  organizationName,
  organizations,
  plants,
  roleOptions,
  user,
  userPermissions,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  categories: ScopeOption[];
  onClose: () => void;
  open: boolean;
  organizationName: string;
  organizations: OrganizationOption[];
  plants: ScopeOption[];
  roleOptions: RoleOption[];
  user: ChartUser | null;
  userPermissions?: UserPermissions;
}) {
  if (!user || !action || !userPermissions?.canUpdate) return null;

  const formId = `organization-user-drawer-${user.id}`;
  const selectedCategoryIds = getUserCategoryIds(user);
  const editableCategories = user.plantId
    ? categories.filter((category) => !category.plantId || category.plantId === user.plantId)
    : [];
  const profileVersion = getAssetVersion(user.profilePhoto?.updatedAt);

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        aria-label="Close user settings"
        className={`absolute inset-0 bg-slate-950/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label="User settings"
        className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-[-20px_0_48px_rgba(15,23,42,0.18)] transition-transform duration-300 sm:p-6 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.profilePhoto)} size="md" userId={user.id} version={profileVersion} />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                <CircleUserRound aria-hidden="true" size={15} />
                User Settings
              </p>
              <h3 className="mt-1 truncate text-2xl font-black text-[var(--ink)]">{user.fullName}</h3>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{user.username} - {formatRoleNameForChart(user.role)}</p>
            </div>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--primary)] hover:text-white" type="button" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form id={formId} action={action} className="mt-6 grid gap-5">
          <AdminUserRoleScopeController formId={formId} organizationName={organizationName} />
          <input name="userId" type="hidden" value={user.id} />

          {organizations.length > 0 ? (
            <label className="grid gap-1 text-sm font-semibold">
              Organization
              <select name="organizationId" defaultValue={user.organizationId ?? ""} data-filters-scope-options="true" className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Username
              <input name="username" required defaultValue={user.username} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Full name
              <input name="fullName" required defaultValue={user.fullName} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold">
            Department
            <input name="department" defaultValue={user.department ?? ""} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Role
              {userPermissions.canAssignRole ? (
                <select name="role" required defaultValue={user.role} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                  {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              ) : (
                <>
                  <input name="role" type="hidden" value={user.role} />
                  <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">{formatRoleNameForChart(user.role)}</span>
                </>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold" data-site-scope-control>
              Site
              {userPermissions.canAssignPlant ? (
                <select name="plantId" defaultValue={user.plantId ?? ""} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                  <option value="">No Site</option>
                  {plants.map((plant) => (
                    <option key={plant.id} value={plant.id} data-organization-id={plant.organizationId ?? ""}>{plant.name}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">{plants.find((plant) => plant.id === user.plantId)?.name ?? "-"}</span>
              )}
            </label>
          </div>

          <div className="grid gap-2 text-sm font-semibold" data-category-scope-control>
            Category
            {userPermissions.canAssignCategories ? (
              <DrawerCategoryCheckboxes categories={editableCategories} selectedIds={selectedCategoryIds} />
            ) : (
              <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">{formatOrgUserCategories(user) || "-"}</span>
            )}
          </div>

          {userPermissions.canAssignInventory ? (
            <InventoryUserScopeFields
              approvalKinds={(user.inventoryScopes ?? [])
                .filter((scope) => scope.approvalEnabled)
                .map((scope) => scope.itemKind)}
              responsibilityKinds={(user.inventoryScopes ?? [])
                .filter((scope) => scope.responsibilityEnabled)
                .map((scope) => scope.itemKind)}
            />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              <span className="inline-flex items-center gap-2"><KeyRound aria-hidden="true" size={16} /> Reset password</span>
              {userPermissions.canResetPassword ? (
                <input name="password" placeholder="Enter new password to reset" type="password" className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
              ) : (
                <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">No permission</span>
              )}
            </label>
            {userPermissions.canDeactivate ? (
              <label className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-sm font-semibold">
                <input name="active" type="checkbox" defaultChecked={user.active !== false} className="h-4 w-4 accent-[var(--primary)]" />
                Active
              </label>
            ) : (
              <span className="mt-6 flex min-h-12 items-center rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-sm font-semibold text-[var(--muted)]">
                {user.active !== false ? "Active" : "Inactive"}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-2"><Upload aria-hidden="true" size={16} /> Upload signature PNG/JPG</span>
              <input name="signature" type="file" accept="image/png,image/jpeg" className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" />
            </label>
            <div className="grid gap-2 text-sm font-semibold">
              Upload profile photo PNG/JPG/WebP
              <ProfilePhotoPreview />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:-mx-6 sm:px-6">
            <Link className="text-sm font-bold text-[var(--primary)] hover:underline" href={`/admin/users#user-${user.id}`}>Open full Admin Users</Link>
            <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:bg-[var(--primary-strong)]" type="submit">
              Save user
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export function OrganizationCreateUserDrawer({
  action,
  categories,
  context,
  onClose,
  open,
  organizationName,
  userPermissions,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  categories: ScopeOption[];
  context: CreateUserContext | null;
  onClose: () => void;
  open: boolean;
  organizationName: string;
  userPermissions?: UserPermissions;
}) {
  if (!context || !action || !userPermissions?.canCreate) return null;

  const formId = `organization-create-user-drawer-${context.organizationId}-${context.plantId ?? "org"}`;
  const categoryOptions = context.plantId
    ? categories.filter((category) => !category.plantId || category.plantId === context.plantId)
    : [];
  const isOrganizationAdmin = context.role === RoleName.ORGANIZATION_ADMIN;

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        aria-label="Close create user"
        className={`absolute inset-0 bg-slate-950/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label={context.title}
        className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-[-20px_0_48px_rgba(15,23,42,0.18)] transition-transform duration-300 sm:p-6 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              <PlusCircle aria-hidden="true" size={15} />
              Organization Site Map
            </p>
            <h3 className="mt-1 truncate text-2xl font-black text-[var(--ink)]">{context.title}</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              {context.organizationName || organizationName}
              {context.plantName ? ` - ${context.plantName}` : ""}
            </p>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--primary)] hover:text-white" type="button" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form id={formId} action={action} className="mt-6 grid gap-5">
          <AdminUserRoleScopeController formId={formId} organizationName={context.organizationName || organizationName} />
          <input name="organizationId" type="hidden" value={context.organizationId} />
          <input name="plantId" type="hidden" value={context.plantId ?? ""} />
          <input name="role" type="hidden" value={context.role} />

          <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Role</span>
              <p className="mt-1 font-black text-[var(--ink)]">{formatRoleNameForChart(context.role)}</p>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Scope</span>
              <p className="mt-1 font-black text-[var(--ink)]">{context.plantName ?? context.organizationName}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Username
              <input name="username" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Full name
              <input name="fullName" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold">
            Department
            <input name="department" defaultValue={context.department} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
          </label>

          <label className="grid gap-1 text-sm font-semibold">
            Password
            <input name="password" required type="password" className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
          </label>

          {!isOrganizationAdmin && userPermissions.canAssignCategories ? (
            <div className="grid gap-2 text-sm font-semibold" data-category-scope-control>
              Category
              <DrawerCategoryCheckboxes categories={categoryOptions} selectedIds={[]} />
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:-mx-6 sm:px-6">
            <Link className="text-sm font-bold text-[var(--primary)] hover:underline" href="/admin/users">Open full Admin Users</Link>
            <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:bg-[var(--primary-strong)]" type="submit">
              Create user
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function DrawerCategoryCheckboxes({
  categories,
  selectedIds,
}: {
  categories: ScopeOption[];
  selectedIds: string[];
}) {
  const selected = new Set(selectedIds);
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
      {categories.length === 0 ? (
        <span className="text-sm font-semibold text-[var(--muted)]">No Category</span>
      ) : (
        categories.map((category) => (
          <label key={category.id} data-category-organization-id={category.organizationId ?? ""} className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold">
            <input className="h-4 w-4 shrink-0 accent-[var(--primary)]" defaultChecked={selected.has(category.id)} name="categoryIds" type="checkbox" value={category.id} />
            <span className="truncate">{category.name}</span>
          </label>
        ))
      )}
    </div>
  );
}
