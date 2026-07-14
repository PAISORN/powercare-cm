import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminStructureTabs } from "../../../components/admin-structure-tabs";
import { AppShell } from "../../../components/app-shell";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { AdminUserRoleScopeController } from "../../../components/admin-user-role-scope-controller";
import { DeleteUserDialog } from "../../../components/delete-user-dialog";
import { ProfilePhotoPreview } from "../../../components/profile-photo-preview";
import { UserAvatar } from "../../../components/user-avatar";
import { db } from "../../../lib/db";
import { deleteStoredFile, saveProfilePhotoFile, saveSignatureFile } from "../../../lib/file-storage";
import { cacheTags, getActiveCategoriesForPlantScope, getActivePlantsForScope, revalidateCmData } from "../../../lib/query-cache";
import { hashPassword, verifyPassword } from "../../../lib/password";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { isSiteAdminRole, RoleName, type RoleName as RoleNameValue } from "../../../modules/cm-work/cm-work-types";
import {
  assertCanManageTargetUser,
  assertManagedUserRole,
  canAssignManagedUserCategories,
  canAssignManagedUserPlant,
  canAssignManagedUserRole,
  canCreateManagedUser,
  canDeactivateManagedUser,
  canDeleteManagedUser,
  canManageUsers,
  canResetManagedUserPassword,
  canUpdateManagedUser,
  getManageableUserWhere,
  resolveManagedUserPlantId,
} from "../../../modules/users/user-admin-scope";
import { isDuplicateUsernameError } from "../../../modules/users/user-prisma-errors";
import { formatRoleName } from "../../../modules/users/role-labels";
import { readOrganizationScope } from "../../../modules/organization/organization-scope-service";
import { DEFAULT_ORGANIZATION_ID } from "../../../modules/organization/organization-foundation";

async function createUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageUsers(current)) redirect("/dashboard");
  if (!canCreateManagedUser(current)) redirect("/admin/users");
  const nextRole = assertManagedUserRole(
    current,
    (canAssignManagedUserRole(current) ? String(formData.get("role")) : RoleName.TECHNICIAN) as RoleNameValue,
  );
  const scope = await readOrganizationScope();
  let organizationId = current.organizationId ?? scope.organization.id;
  const username = String(formData.get("username") ?? "").trim();
  if (current.role === RoleName.ADMIN) {
    organizationId = String(formData.get("organizationId") || current.organizationId || DEFAULT_ORGANIZATION_ID);
  }
  if (current.role === RoleName.ORGANIZATION_ADMIN) {
    organizationId = current.organizationId ?? DEFAULT_ORGANIZATION_ID;
  }
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) redirect("/admin/users?createStatus=orgRequired");
  const canAssignCategories = canAssignManagedUserCategories(current);
  const selectedCategoryIds = nextRole === RoleName.ORGANIZATION_ADMIN
    ? []
    : canAssignCategories ? normalizeSelectedCategoryIds(formData) : [];
  const plantId = nextRole === RoleName.ORGANIZATION_ADMIN
    ? null
    : canAssignManagedUserPlant(current)
      ? resolveManagedUserPlantId(current, String(formData.get("plantId") || "") || null)
      : resolveManagedUserPlantId(current, null);
  const department = normalizeManagedUserDepartment(nextRole, formData, organization.name);
  if (plantId) await assertPlantInsideOrganization(plantId, organizationId);
  if (selectedCategoryIds.length && plantId) await assertCategoriesInsidePlant(selectedCategoryIds, plantId);
  if (plantId) {
    const site = await db.plant.findUnique({ where: { id: plantId }, select: { maxUsers: true } });
    if (site?.maxUsers) {
      const activeUsers = await db.user.count({ where: { plantId, active: true } });
      if (activeUsers >= site.maxUsers) redirect("/admin/users?createStatus=quota");
    }
  }

  let created;
  try {
    created = await db.user.create({
      data: {
        username,
        passwordHash: await hashPassword(String(formData.get("password"))),
        fullName: String(formData.get("fullName")),
        department,
        role: nextRole,
      organizationId,
        plantId,
        categoryId: selectedCategoryIds[0] ?? null,
        ...(canAssignCategories ? { categories: { create: selectedCategoryIds.map((categoryId) => ({ categoryId })) } } : {}),
        active: true,
      },
    });
  } catch (error) {
    if (isDuplicateUsernameError(error)) redirect("/admin/users?createStatus=duplicate");
    throw error;
  }

  await recordAudit({
    actorId: current.id,
    organizationId,
    plantId: current.plantId,
    entityType: "User",
    entityId: created.id,
    action: "CREATE_USER",
    after: {
      username: created.username,
      fullName: created.fullName,
      department: created.department,
      role: created.role,
      organizationId: created.organizationId,
      plantId: created.plantId,
      categoryId: created.categoryId,
      categoryIds: selectedCategoryIds,
      active: created.active,
    },
  });

  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect("/admin/users");
}

async function updateUserProfile(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageUsers(current)) redirect("/dashboard");
  if (!canUpdateManagedUser(current)) redirect("/admin/users");

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === current.id) redirect("/admin/users");

  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { signature: true, profilePhoto: true, categories: true } });
  assertCanManageTargetUser(current, before);
  const scope = await readOrganizationScope();
  let organizationId = before.organizationId ?? current.organizationId ?? scope.organization.id;
  const nextRole = canAssignManagedUserRole(current)
    ? assertManagedUserRole(current, String(formData.get("role")) as RoleNameValue)
    : before.role;
  if (current.role === RoleName.ADMIN && nextRole !== RoleName.ORGANIZATION_ADMIN) {
    organizationId = String(formData.get("organizationId") || before.organizationId || current.organizationId || DEFAULT_ORGANIZATION_ID);
  }
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  const organizationName = organization?.name ?? scope.organization.name;
  const nextPlantId = nextRole === RoleName.ORGANIZATION_ADMIN
    ? null
    : canAssignManagedUserPlant(current)
      ? resolveManagedUserPlantId(current, String(formData.get("plantId") || "") || null)
      : before.plantId;
  const canAssignCategories = canAssignManagedUserCategories(current);
  const selectedCategoryIds = nextRole === RoleName.ORGANIZATION_ADMIN
    ? []
    : canAssignCategories ? normalizeSelectedCategoryIds(formData) : getUserCategoryIds(before);
  const department = normalizeManagedUserDepartment(nextRole, formData, organizationName);
  if (nextPlantId) await assertPlantInsideOrganization(nextPlantId, organizationId);
  if (selectedCategoryIds.length && nextPlantId) await assertCategoriesInsidePlant(selectedCategoryIds, nextPlantId);
  const nextActive = canDeactivateManagedUser(current) ? formData.get("active") === "on" : before.active;
  const password = String(formData.get("password") ?? "").trim();
  if (password && !canResetManagedUserPassword(current)) redirect("/admin/users");
  const signature = formData.get("signature");
  const signatureFile = signature instanceof File && signature.size > 0 ? signature : null;
  const signatureData = signatureFile ? await saveSignatureFile(userId, signatureFile) : null;
  const profilePhoto = formData.get("profilePhoto");
  const profilePhotoFile = profilePhoto instanceof File && profilePhoto.size > 0 ? profilePhoto : null;
  const profilePhotoData = profilePhotoFile ? await saveProfilePhotoFile(userId, profilePhotoFile) : null;

  let updated;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: {
        username: String(formData.get("username") ?? "").trim(),
        fullName: String(formData.get("fullName") ?? "").trim(),
        department,
        role: nextRole,
        organizationId,
        plantId: nextPlantId,
        ...(canAssignCategories
          ? {
              categoryId: selectedCategoryIds[0] ?? null,
              categories: {
                deleteMany: {},
                create: selectedCategoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : {}),
        active: nextActive,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        ...(signatureData
          ? {
              signature: {
                upsert: {
                  update: signatureData,
                  create: signatureData,
                },
              },
            }
          : {}),
        ...(profilePhotoData
          ? {
              profilePhoto: {
                upsert: {
                  update: profilePhotoData,
                  create: profilePhotoData,
                },
              },
            }
          : {}),
      },
      include: { signature: true, profilePhoto: true },
    });
  } catch (error) {
    if (isDuplicateUsernameError(error)) {
      await Promise.all([deleteStoredFile(signatureData?.storagePath), deleteStoredFile(profilePhotoData?.storagePath)]);
      redirect("/admin/users?updateStatus=duplicate");
    }
    throw error;
  }

  await recordAudit({
    actorId: current.id,
    organizationId: current.organizationId,
    plantId: current.plantId,
    entityType: "User",
    entityId: userId,
    action: "UPDATE_USER_PROFILE",
    before: {
      username: before.username,
      fullName: before.fullName,
      department: before.department,
      role: before.role,
      plantId: before.plantId,
      categoryId: before.categoryId,
      active: before.active,
      hasSignature: Boolean(before.signature),
      hasProfilePhoto: Boolean(before.profilePhoto),
    },
    after: {
      username: updated.username,
      fullName: updated.fullName,
      department: updated.department,
      role: updated.role,
      plantId: updated.plantId,
      categoryId: updated.categoryId,
      categoryIds: selectedCategoryIds,
      active: updated.active,
      passwordReset: Boolean(password),
      hasSignature: Boolean(updated.signature),
      hasProfilePhoto: Boolean(updated.profilePhoto),
    },
  });
  if (profilePhotoData && before.profilePhoto?.storagePath && before.profilePhoto.storagePath !== profilePhotoData.storagePath) {
    await deleteStoredFile(before.profilePhoto.storagePath);
  }

  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect("/admin/users");
}

async function deleteUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageUsers(current)) redirect("/dashboard");
  if (!canDeleteManagedUser(current)) redirect("/admin/users");

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === current.id) redirect("/admin/users");

  const adminPassword = String(formData.get("adminPassword") ?? "");
  const currentAdmin = await db.user.findUniqueOrThrow({ where: { id: current.id } });
  const passwordOk = await verifyPassword(adminPassword, currentAdmin.passwordHash);
  if (!passwordOk) redirect("/admin/users?deleteStatus=error");

  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { signature: true, category: true, plant: true, profilePhoto: true } });
  assertCanManageTargetUser(current, before);
  await db.$transaction([
    db.auditEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } }),
    db.statusHistory.updateMany({ where: { changedById: userId }, data: { changedById: null } }),
    db.cmWork.updateMany({ where: { claimantId: userId }, data: { claimantId: null } }),
    db.cmWork.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } }),
    db.signature.deleteMany({ where: { userId } }),
    db.profilePhoto.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
    db.auditEvent.create({
      data: {
        actorId: current.id,
        organizationId: current.organizationId,
        plantId: current.plantId,
        entityType: "User",
        entityId: userId,
        action: "DELETE_USER",
        beforeJson: JSON.stringify({
          username: before.username,
          fullName: before.fullName,
          department: before.department,
          role: before.role,
          plantName: before.plant?.name ?? null,
          categoryName: before.category?.name ?? null,
          active: before.active,
          hasSignature: Boolean(before.signature),
          hasProfilePhoto: Boolean(before.profilePhoto),
        }),
      },
    }),
  ]);
  await Promise.all([deleteStoredFile(before.profilePhoto?.storagePath), deleteStoredFile(before.signature?.storagePath)]);

  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect("/admin/users?deleteStatus=success");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ createStatus?: string; deleteStatus?: string; organizationId?: string; plantId?: string; role?: string; updateStatus?: string }>;
}) {
  const user = await requireUser();
  if (!canManageUsers(user)) redirect("/dashboard");
  const {
    createStatus,
    deleteStatus,
    organizationId: requestedOrganizationId = "",
    plantId: selectedPlantId = "",
    role: roleFilter = "",
    updateStatus,
  } = await searchParams;
  const userWhere = getManageableUserWhere(user);
  const organizations = user.role === RoleName.ADMIN
    ? await db.organization.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const selectedOrganizationId = user.role === RoleName.ADMIN
    ? normalizeOrganizationFilter(requestedOrganizationId, organizations)
    : user.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const canFilterByPlant = user.role === RoleName.ADMIN || user.role === RoleName.ORGANIZATION_ADMIN;
  const roleFilterOptions = getRoleFilterOptionsForUserManager(user.role);
  const selectedRole = normalizeRoleFilter(roleFilter, roleFilterOptions);
  const filteredUserWhere = applyUserDirectoryFilters(
    userWhere,
    selectedRole,
    canFilterByPlant ? selectedPlantId : "",
    selectedOrganizationId,
  );
  const formOrganizationId = selectedOrganizationId || user.organizationId || DEFAULT_ORGANIZATION_ID;
  const formPlantId = selectedPlantId || user.plantId || undefined;

  const [users, categories, plants, scope, formOrganization, createFormPlants, createFormCategories] = await Promise.all([
    db.user.findMany({ where: filteredUserWhere, include: { category: true, categories: { include: { category: true } }, plant: true, signature: true, profilePhoto: true }, orderBy: { createdAt: "desc" } }),
    getActiveCategoriesForPlantScope(formPlantId, formOrganizationId),
    getActivePlantsForScope(formOrganizationId),
    readOrganizationScope(),
    db.organization.findUnique({
      where: { id: formOrganizationId },
      select: { id: true, name: true, slug: true },
    }),
    user.role === RoleName.ADMIN
      ? db.plant.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true, organizationId: true },
        })
      : getActivePlantsForScope(formOrganizationId).then((items) => items.map((item) => ({ ...item, organizationId: formOrganizationId }))),
    user.role === RoleName.ADMIN
      ? db.category.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, organizationId: true, plantId: true },
        })
      : getActiveCategoriesForPlantScope(formPlantId, formOrganizationId).then((items) => items.map((item) => ({ ...item, organizationId: formOrganizationId, plantId: formPlantId ?? null }))),
  ]);
  const organizationName = formOrganization?.name ?? organizations.find((organization) => organization.id === formOrganizationId)?.name ?? scope.organization.name;
  const visiblePlants = getPlantsForUserManager(user, plants);
  const editFormPlants = user.role === RoleName.ADMIN
    ? createFormPlants
    : visiblePlants.map((plant) => ({ ...plant, organizationId: formOrganizationId }));
  const editFormCategories = user.role === RoleName.ADMIN
    ? createFormCategories
    : categories.map((category) => ({ ...category, organizationId: formOrganizationId, plantId: formPlantId ?? null }));
  const roleOptions = getRoleOptionsForUserManager(user.role);
  const defaultCreateUserRole = RoleName.TECHNICIAN;
  const userPermissions = {
    canCreate: canCreateManagedUser(user),
    canUpdate: canUpdateManagedUser(user),
    canResetPassword: canResetManagedUserPassword(user),
    canAssignRole: canAssignManagedUserRole(user),
    canAssignPlant: canAssignManagedUserPlant(user),
    canAssignCategories: canAssignManagedUserCategories(user),
    canDeactivate: canDeactivateManagedUser(user),
    canDelete: canDeleteManagedUser(user),
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Users</h1>
      <AdminStructureTabs activeTab="users" />
      <DuplicateUsernameNotice createStatus={createStatus} updateStatus={updateStatus} />
      <CreateQuotaNotice createStatus={createStatus} />
      <OrganizationRequiredNotice createStatus={createStatus} />
      <DeleteStatusNotice status={deleteStatus} />

      {canFilterByPlant ? (
        <form className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] md:grid-cols-[minmax(180px,260px)_minmax(180px,280px)_1fr_auto_auto] md:items-end" method="get">
          {user.role === RoleName.ADMIN ? (
            <label className="grid gap-1 text-sm font-semibold">
              Organization
              <AutoSubmitSelect className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={selectedOrganizationId} name="organizationId">
                <option value="">All Organizations</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </AutoSubmitSelect>
            </label>
          ) : null}
          <label className="grid gap-1 text-sm font-semibold">
            Role / Level
            <AutoSubmitSelect className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={selectedRole} name="role">
              <option value="">All Roles</option>
              {roleFilterOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </AutoSubmitSelect>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Site
            <AutoSubmitSelect className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={selectedPlantId} name="plantId">
              <option value="">All Sites</option>
              {visiblePlants.map((plant) => (
                <option key={plant.id} value={plant.id}>{plant.name}</option>
              ))}
            </AutoSubmitSelect>
          </label>
          <button className="min-h-12 rounded-xl bg-[var(--primary)] px-5 font-bold text-white" type="submit">Filter</button>
          <a className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] px-5 font-semibold" href="/admin/users">Clear</a>
        </form>
      ) : null}

      {userPermissions.canCreate ? (
      <form id="create-user-form" action={createUser} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <AdminUserRoleScopeController formId="create-user-form" organizationName={organizationName} />
        {user.role === RoleName.ADMIN ? (
          <label className="grid gap-1 text-sm font-semibold">
            Organization
            <select name="organizationId" defaultValue={formOrganizationId} data-filters-scope-options="true" className="rounded-md border p-3 text-black">
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <p data-organization-admin-scope-control className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-xs font-semibold text-[var(--muted)]">
          Organization Admin must be assigned to an existing Organization. Create the Organization first from Admin Settings &gt; Organization.
        </p>
        <input name="username" required placeholder="Username" className="rounded-md border p-3 text-black" />
        <input name="password" required placeholder="Password" type="password" className="rounded-md border p-3 text-black" />
        <input name="fullName" required placeholder="ชื่อ-นามสกุล" className="rounded-md border p-3 text-black" />
        <input name="department" placeholder="หน่วยงาน" className="rounded-md border p-3 text-black" />
        {userPermissions.canAssignRole ? (
          <select name="role" required defaultValue={defaultCreateUserRole} className="rounded-md border p-3 text-black">
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        ) : <input name="role" type="hidden" value={defaultCreateUserRole} />}
        {userPermissions.canAssignPlant ? (
        <div data-site-scope-control>
          <select name="plantId" className="w-full rounded-md border p-3 text-black">
            <option value="">ไม่ผูก Site</option>
            {createFormPlants.map((plant) => (
              <option key={plant.id} value={plant.id} data-organization-id={plant.organizationId}>
                {plant.name}
              </option>
            ))}
          </select>
        </div>
        ) : null}
        {userPermissions.canAssignCategories ? (
          <div data-category-scope-control>
            <CategoryCheckboxList categories={createFormCategories} selectedIds={[]} />
          </div>
        ) : null}
        <p className="text-xs font-semibold text-[var(--muted)]">
          ถ้าเลือก Organization Admin ระบบจะใช้หน่วยงานเป็นชื่อองค์กร และไม่ผูก Site/Category
        </p>
        <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">สร้างผู้ใช้</button>
      </form>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {users.map((item) => (
          <div key={item.id} id={`user-${item.id}`} aria-label={`User ${item.username}`} className="reveal-on-scroll rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar fullName={item.fullName} hasPhoto={Boolean(item.profilePhoto)} size="md" userId={item.id} version={item.profilePhoto?.updatedAt.getTime()} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{item.fullName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {item.username} • {item.department || "-"} • {item.signature ? "มีลายเซ็น" : "ยังไม่มีลายเซ็น"} • {item.profilePhoto ? "มีรูปโปรไฟล์" : "ยังไม่มีรูปโปรไฟล์"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Site: {item.plant?.name ?? "-"}</p>
                </div>
              </div>
              {item.id === user.id ? <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">บัญชีปัจจุบัน</span> : null}
            </div>

            {item.id === user.id ? (
              <div className="mt-4 grid gap-3 rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)] md:grid-cols-4">
                <span>Role: {formatRoleName(item.role)}</span>
                <span>Site: {item.plant?.name ?? "-"}</span>
                <span>Category: {formatUserCategories(item) || "-"}</span>
                <span>Status: {item.active ? "Active" : "Inactive"}</span>
              </div>
            ) : userPermissions.canUpdate ? (
              <details className="mt-4 overflow-hidden rounded-2xl bg-[var(--soft)] p-3">
                <summary className="cursor-pointer select-none rounded-xl px-2 py-2 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--surface)]">
                  ดูรายละเอียด / แก้ไข
                </summary>
              <form
                id={`edit-user-form-${item.id}`}
                action={updateUserProfile}
                aria-label={`Edit ${item.username}`}
                className="mt-3 grid min-w-0 gap-4 overflow-hidden rounded-2xl bg-[var(--soft)] p-1"
              >
                <AdminUserRoleScopeController formId={`edit-user-form-${item.id}`} organizationName={organizationName} />
                <input name="userId" type="hidden" value={item.id} />
                {user.role === RoleName.ADMIN ? (
                  <label className="grid gap-1 text-sm font-semibold" data-edit-user-organization-scope>
                    Organization
                    <select
                      name="organizationId"
                      defaultValue={item.organizationId ?? formOrganizationId}
                      data-filters-scope-options="true"
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]"
                    >
                      {organizations.map((organization) => (
                        <option key={organization.id} value={organization.id}>{organization.name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Username
                    <input name="username" required defaultValue={item.username} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    ชื่อ-นามสกุล
                    <input name="fullName" required defaultValue={item.fullName} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    หน่วยงาน
                    <input name="department" defaultValue={item.department ?? ""} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                </div>
                <div className="user-edit-single-column-grid grid min-w-0 gap-3 xl:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Role
                    {userPermissions.canAssignRole ? (
                      <select name="role" defaultValue={item.role} required className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]">
                        {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    ) : (
                      <>
                        <input name="role" type="hidden" value={item.role} />
                         <span className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--muted)]">{formatRoleName(item.role)}</span>
                      </>
                    )}
                  </label>
                  <label className="grid gap-1 text-sm font-semibold xl:col-span-2" data-site-scope-control>
                    Site
                    {userPermissions.canAssignPlant ? (
                    <select name="plantId" defaultValue={item.plantId ?? ""} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]">
                      <option value="">ไม่ผูก Site</option>
                      {editFormPlants.map((plant) => (
                        <option key={plant.id} value={plant.id} data-organization-id={plant.organizationId}>
                          {plant.name}
                        </option>
                      ))}
                    </select>
                    ) : (
                      <span className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--muted)]">{item.plant?.name ?? "-"}</span>
                    )}
                  </label>
                  <div className="grid min-w-0 gap-1 text-sm font-semibold xl:col-span-2" data-category-scope-control>
                    Category
                    {userPermissions.canAssignCategories ? (
                      <CategoryCheckboxList categories={editFormCategories} selectedIds={getUserCategoryIds(item)} />
                    ) : (
                      <span className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--muted)]">{formatUserCategories(item) || "-"}</span>
                    )}
                  </div>
                  <label className="grid gap-1 text-sm font-semibold">
                    Reset password
                    {userPermissions.canResetPassword ? (
                      <input name="password" placeholder="ใส่รหัสใหม่เมื่อต้องการ reset" type="password" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                    ) : <span className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--muted)]">No permission</span>}
                  </label>
                  {userPermissions.canDeactivate ? (
                    <label className="flex h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold">
                      <input name="active" type="checkbox" defaultChecked={item.active} className="h-4 w-4" />
                      Active
                    </label>
                  ) : (
                    <span className="flex h-12 items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--muted)]">
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
                <div className="user-edit-file-grid grid min-w-0 gap-3 xl:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Upload signature PNG/JPG, max 500 KB
                    <input name="signature" type="file" accept="image/png,image/jpeg" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <div className="grid gap-1 text-sm font-semibold">
                    Upload profile photo PNG/JPG/WebP, max 1 MB
                    <ProfilePhotoPreview />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="h-12 rounded-xl bg-[var(--primary)] px-4 font-bold text-white shadow-sm" type="submit">
                    บันทึกทั้งหมด
                  </button>
                </div>
              </form>
              </details>
            ) : (
              <div className="mt-4 grid gap-3 rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)] md:grid-cols-4">
                 <span>Role: {formatRoleName(item.role)}</span>
                <span>Site: {item.plant?.name ?? "-"}</span>
                <span>Category: {formatUserCategories(item) || "-"}</span>
                <span>Status: {item.active ? "Active" : "Inactive"}</span>
              </div>
            )}

            {item.id !== user.id && userPermissions.canDelete ? (
              <div className="mt-3 flex justify-end">
                <DeleteUserDialog action={deleteUser} fullName={item.fullName} userId={item.id} username={item.username} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function DeleteStatusNotice({ status }: { status?: string }) {
  if (status === "success") {
    return (
      <div role="status" className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-7 text-center text-emerald-700 shadow-sm">
        <CheckCircle2 aria-hidden="true" size={74} strokeWidth={2.2} />
        <strong className="mt-3 text-2xl">ลบสำเร็จ</strong>
        <span className="mt-1 text-sm font-semibold text-emerald-600">ระบบบันทึกประวัติการลบไว้เรียบร้อยแล้ว</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 px-5 py-7 text-center text-red-700 shadow-sm">
        <XCircle aria-hidden="true" size={74} strokeWidth={2.2} />
        <strong className="mt-3 text-2xl">ไม่สำเร็จ</strong>
        <span className="mt-1 text-sm font-semibold text-red-600">โปรดตรวจสอบรหัสผ่าน</span>
      </div>
    );
  }

  return null;
}

function CreateQuotaNotice({ createStatus }: { createStatus?: string }) {
  if (createStatus !== "quota") return null;
  return (
    <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 shadow-sm">
      Site นี้มีจำนวน Users ถึง limit แล้ว กรุณาปรับ quota ก่อนสร้างผู้ใช้เพิ่ม
    </div>
  );
}

function OrganizationRequiredNotice({ createStatus }: { createStatus?: string }) {
  if (createStatus !== "orgRequired") return null;
  return (
    <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800 shadow-sm">
      Please create or select an Organization before creating an Organization Admin.
    </div>
  );
}

function DuplicateUsernameNotice({
  createStatus,
  updateStatus,
}: {
  createStatus?: string;
  updateStatus?: string;
}) {
  if (createStatus !== "duplicate" && updateStatus !== "duplicate") return null;
  const actionLabel = createStatus === "duplicate" ? "สร้างผู้ใช้" : "บันทึกข้อมูลผู้ใช้";

  return (
    <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 shadow-sm">
      <XCircle aria-hidden="true" className="mt-0.5 shrink-0" size={28} strokeWidth={2.2} />
      <div>
        <strong className="text-base">Username นี้ถูกใช้งานแล้ว</strong>
        <p className="mt-1 text-sm font-semibold text-amber-700">
          ไม่สามารถ{actionLabel}ได้ กรุณาเปลี่ยน Username เป็นชื่ออื่นแล้วลองอีกครั้ง
        </p>
      </div>
    </div>
  );
}

function getRoleOptionsForUserManager(role: string) {
  const options = [
    { value: RoleName.ORGANIZATION_ADMIN, label: "Organization Admin" },
    { value: RoleName.SITE_ADMIN, label: "Site Admin" },
    { value: RoleName.ENGINEER, label: "Engineer" },
    { value: RoleName.TECHNICIAN, label: "Technician" },
    { value: RoleName.STORE_OFFICER, label: "Store Officer" },
    { value: RoleName.VISITOR, label: "Visitor" },
  ];
  if (role === RoleName.ORGANIZATION_ADMIN) {
    return options.filter((option) => option.value !== RoleName.ORGANIZATION_ADMIN);
  }
  return isSiteAdminRole(role)
    ? options.filter((option) => option.value !== RoleName.SITE_ADMIN)
    : options;
}

function getRoleFilterOptionsForUserManager(role: string) {
  const options = [
    { value: RoleName.ORGANIZATION_ADMIN, label: "Organization Admin" },
    { value: RoleName.SITE_ADMIN, label: "Site Admin" },
    { value: RoleName.ENGINEER, label: "Engineer" },
    { value: RoleName.TECHNICIAN, label: "Technician" },
    { value: RoleName.STORE_OFFICER, label: "Store Officer" },
    { value: RoleName.VISITOR, label: "Visitor" },
  ];
  if (role === RoleName.ADMIN) return options;
  if (role === RoleName.ORGANIZATION_ADMIN) return options.filter((option) => option.value !== RoleName.ORGANIZATION_ADMIN);
  if (isSiteAdminRole(role)) return options.filter((option) => option.value !== RoleName.ORGANIZATION_ADMIN && option.value !== RoleName.SITE_ADMIN);
  return [];
}

function normalizeRoleFilter(role: string, options: { value: RoleNameValue; label: string }[]) {
  return options.some((option) => option.value === role) ? role : "";
}

function normalizeOrganizationFilter(
  organizationId: string,
  organizations: { id: string }[],
) {
  return organizations.some((organization) => organization.id === organizationId) ? organizationId : "";
}

function applyUserDirectoryFilters(
  userWhere: Record<string, unknown>,
  selectedRole: string,
  selectedPlantId: string,
  selectedOrganizationId: string,
) {
  const organizationScoped = selectedOrganizationId ? { ...userWhere, organizationId: selectedOrganizationId } : userWhere;
  const roleScoped = selectedRole ? { ...organizationScoped, role: selectedRole } : organizationScoped;
  if (!selectedPlantId || selectedRole === RoleName.ORGANIZATION_ADMIN) return roleScoped;
  return { ...roleScoped, plantId: selectedPlantId };
}

async function assertPlantInsideOrganization(plantId: string, organizationId: string) {
  const plant = await db.plant.findFirst({
    where: { id: plantId, organizationId },
    select: { id: true },
  });
  if (!plant) redirect("/admin/users");
}

async function assertCategoriesInsidePlant(categoryIds: string[], plantId: string) {
  const uniqueIds = [...new Set(categoryIds)];
  const categories = await db.category.findMany({
    where: {
      id: { in: uniqueIds },
      OR: [{ plantId }, { plantId: null }],
    },
    select: { id: true },
  });
  if (categories.length !== uniqueIds.length) redirect("/admin/users");
}

function getPlantsForUserManager<T extends { id: string }>(user: { role: string; plantId?: string | null }, plants: T[]) {
  if (!isSiteAdminRole(user.role)) return plants;
  return plants.filter((plant) => plant.id === user.plantId);
}

function CategoryCheckboxList({
  categories,
  selectedIds,
}: {
  categories: { id: string; name: string; organizationId?: string | null; plantId?: string | null }[];
  selectedIds: string[];
}) {
  const selected = new Set(selectedIds);
  return (
    <div className="grid min-w-0 gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      {categories.length === 0 ? (
        <span className="text-sm font-semibold text-[var(--muted)]">No Category</span>
      ) : (
        categories.map((category) => (
          <label
            key={category.id}
            data-category-organization-id={category.organizationId ?? ""}
            data-category-plant-id={category.plantId ?? ""}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--soft)] px-3 py-2 text-sm font-semibold"
          >
            <input
              className="h-4 w-4 shrink-0 accent-[var(--primary)]"
              defaultChecked={selected.has(category.id)}
              name="categoryIds"
              type="checkbox"
              value={category.id}
            />
            <span className="min-w-0 flex-1 truncate">{category.name}</span>
          </label>
        ))
      )}
    </div>
  );
}

function normalizeSelectedCategoryIds(formData: FormData) {
  const selected = formData
    .getAll("categoryIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const legacy = String(formData.get("categoryId") || "").trim();
  return [...new Set(legacy ? [legacy, ...selected] : selected)];
}

function normalizeManagedUserDepartment(role: string, formData: FormData, organizationName: string) {
  if (role === RoleName.ORGANIZATION_ADMIN) return organizationName;
  return String(formData.get("department") ?? "").trim();
}

function getUserCategoryIds(user: { categoryId: string | null; categories?: { categoryId: string }[] }) {
  const ids = [
    ...(user.categoryId ? [user.categoryId] : []),
    ...(user.categories ?? []).map((item) => item.categoryId),
  ];
  return [...new Set(ids)];
}

function formatUserCategories(user: {
  category?: { name: string } | null;
  categories?: { category: { name: string } }[];
}) {
  const names = [
    ...(user.category?.name ? [user.category.name] : []),
    ...(user.categories ?? []).map((item) => item.category.name),
  ];
  return [...new Set(names)].join(", ");
}
