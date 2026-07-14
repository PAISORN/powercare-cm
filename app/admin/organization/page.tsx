import { Building2, Image as ImageIcon, PlusCircle, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminStructureTabs } from "../../../components/admin-structure-tabs";
import { AppShell } from "../../../components/app-shell";
import { OrganizationSiteMap } from "../../../components/organization-site-map";
import { db } from "../../../lib/db";
import { deleteStoredFile, saveOrganizationLogoFile, savePlantLogoFile, saveProfilePhotoFile, saveSignatureFile } from "../../../lib/file-storage";
import { cacheTags, getActiveCategoriesForPlantScope, getActivePlantsForScope, revalidateCmData } from "../../../lib/query-cache";
import { hashPassword } from "../../../lib/password";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import {
  canManageCompanyOrganization,
  canManageOrganization,
  canManagePlantProfile,
} from "../../../modules/auth/permission";
import { isSiteAdminRole, RoleName, type Actor, type RoleName as RoleNameValue } from "../../../modules/cm-work/cm-work-types";
import { isDuplicateUsernameError } from "../../../modules/users/user-prisma-errors";
import {
  assertCanManageTargetUser,
  assertManagedUserRole,
  canAssignManagedUserCategories,
  canAssignManagedUserPlant,
  canAssignManagedUserRole,
  canCreateManagedUser,
  canDeactivateManagedUser,
  canManageUsers,
  canResetManagedUserPassword,
  canUpdateManagedUser,
  resolveManagedUserPlantId,
} from "../../../modules/users/user-admin-scope";
import {
  readOrganizationProfile,
  updateOrganizationProfile,
} from "../../../modules/organization/organization-service";
import {
  readOrganizationScope,
  updatePlantScope,
  updateOrganizationScope,
} from "../../../modules/organization/organization-scope-service";
import { readPlantProfile, updatePlantProfile } from "../../../modules/organization/plant-profile-service";
import { DEFAULT_ORGANIZATION_ID, normalizeOrganizationRecordInput } from "../../../modules/organization/organization-foundation";

function actorFrom(user: {
  id: string;
  role: string;
  categoryId: string | null;
  organizationId?: string | null;
  plantId?: string | null;
  siteAdminPermissions?: Actor["siteAdminPermissions"];
}): Actor {
  return {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    organizationId: user.organizationId,
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
}

async function readOrganizationScopeForUser(user: {
  role: string;
  organizationId?: string | null;
  plantId?: string | null;
}) {
  if (user.role === RoleName.ADMIN && !user.organizationId && !user.plantId) {
    return readOrganizationScope();
  }

  const organizationId = user.organizationId || DEFAULT_ORGANIZATION_ID;
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true },
  });
  const plant = user.plantId
    ? await db.plant.findUnique({
        where: { id: user.plantId },
        select: { id: true, name: true, code: true },
      })
    : await db.plant.findFirst({
        where: { organizationId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      });

  const fallback = await readOrganizationScope();
  return {
    organization: organization ?? fallback.organization,
    plant: plant ?? fallback.plant,
  };
}

async function updateOrganizationAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageOrganization(user) && !canManagePlantProfile(user)) redirect("/dashboard");
  const actor = actorFrom(user);
  const canEditCompany = canManageCompanyOrganization(user);
  const canEditPlant = canManagePlantProfile(user);
  const profileOrganizationId = user.organizationId || DEFAULT_ORGANIZATION_ID;

  const existing = await readOrganizationProfile(profileOrganizationId);
  const existingPlantProfile = await readPlantProfile(user.plantId);
  const file = formData.get("logo");
  const plantLogo = formData.get("plantLogo");
  let uploaded: Awaited<ReturnType<typeof saveOrganizationLogoFile>> | null = null;
  let uploadedPlantLogo: Awaited<ReturnType<typeof savePlantLogoFile>> | null = null;

  try {
    if (canEditCompany) {
      await updateOrganizationScope(
        actor,
        {
          organizationName: String(formData.get("organizationName") ?? ""),
          organizationSlug: String(formData.get("organizationSlug") ?? ""),
          plantName: String(formData.get("plantName") ?? ""),
          plantCode: String(formData.get("plantCode") ?? ""),
        },
      );
      if (file instanceof File && file.size > 0) {
        uploaded = await saveOrganizationLogoFile(profileOrganizationId, file);
      }
      await updateOrganizationProfile(
        actor,
        {
          companyName: String(formData.get("companyName") ?? ""),
          logoFileName: uploaded?.fileName ?? existing.logoFileName,
          logoMimeType: uploaded?.mimeType ?? existing.logoMimeType,
          logoFileSize: uploaded?.fileSize ?? existing.logoFileSize,
          logoStoragePath: uploaded?.storagePath ?? existing.logoStoragePath,
        },
      );
    } else if (canEditPlant) {
      await updatePlantScope(actor, {
        plantName: String(formData.get("plantName") ?? ""),
        plantCode: String(formData.get("plantCode") ?? ""),
      });
      if (plantLogo instanceof File && plantLogo.size > 0) {
        uploadedPlantLogo = await savePlantLogoFile(user.plantId || "primary-plant", plantLogo);
      }
      await updatePlantProfile(
        actor,
        {
          companyName: String(formData.get("siteCompanyName") || formData.get("plantName") || ""),
          address: String(formData.get("siteAddress") ?? ""),
          contactName: String(formData.get("siteContactName") ?? ""),
          contactPhone: String(formData.get("siteContactPhone") ?? ""),
          notes: String(formData.get("siteNotes") ?? ""),
          logoFileName: uploadedPlantLogo?.fileName ?? existingPlantProfile.logoFileName,
          logoMimeType: uploadedPlantLogo?.mimeType ?? existingPlantProfile.logoMimeType,
          logoFileSize: uploadedPlantLogo?.fileSize ?? existingPlantProfile.logoFileSize,
          logoStoragePath: uploadedPlantLogo?.storagePath ?? existingPlantProfile.logoStoragePath,
        },
        user.plantId,
      );
    } else {
      redirect("/dashboard");
    }
  } catch {
    await deleteStoredFile(uploaded?.storagePath);
    await deleteStoredFile(uploadedPlantLogo?.storagePath);
    redirect("/admin/organization?error=1");
  }

  if (uploaded && existing.logoStoragePath !== uploaded.storagePath) {
    await deleteStoredFile(existing.logoStoragePath);
  }
  if (uploadedPlantLogo && existingPlantProfile.logoStoragePath !== uploadedPlantLogo.storagePath) {
    await deleteStoredFile(existingPlantProfile.logoStoragePath);
  }
  redirect("/admin/organization?saved=1");
}

async function createOrganizationAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  const organization = normalizeOrganizationRecordInput({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  const existing = await db.organization.findFirst({
    where: { OR: [{ name: organization.name }, { slug: organization.slug }] },
    select: { id: true },
  });
  if (existing) redirect("/admin/organization?created=duplicate");

  const created = await db.organization.create({
    data: {
      name: organization.name,
      slug: organization.slug,
      active: true,
    },
  });
  await recordAudit({
    actorId: user.id,
    organizationId: created.id,
    entityType: "Organization",
    entityId: created.id,
    action: "CREATE_ORGANIZATION",
    after: { name: created.name, slug: created.slug, active: created.active },
  });
  redirect("/admin/organization?created=1");
}

async function createOrganizationMapUserAction(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageUsers(current) || !canCreateManagedUser(current)) redirect("/dashboard");

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
  if (!organization) redirect("/admin/organization?userStatus=orgRequired");

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
      if (activeUsers >= site.maxUsers) redirect("/admin/organization?userStatus=quota");
    }
  }

  let created;
  try {
    created = await db.user.create({
      data: {
        username,
        passwordHash: await hashPassword(String(formData.get("password"))),
        fullName: String(formData.get("fullName") ?? "").trim(),
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
    if (isDuplicateUsernameError(error)) redirect("/admin/organization?userStatus=duplicate");
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
  redirect("/admin/organization?userStatus=created");
}

async function updateOrganizationMapUserAction(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (!canManageUsers(current) || !canUpdateManagedUser(current)) redirect("/dashboard");

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === current.id) redirect("/admin/organization");

  const before = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { signature: true, profilePhoto: true, categories: true },
  });
  assertCanManageTargetUser(current, before);

  const scope = await readOrganizationScope();
  let organizationId = before.organizationId ?? current.organizationId ?? scope.organization.id;
  const nextRole = canAssignManagedUserRole(current)
    ? assertManagedUserRole(current, String(formData.get("role")) as RoleNameValue)
    : before.role;
  if (current.role === RoleName.ADMIN && nextRole !== RoleName.ORGANIZATION_ADMIN) {
    organizationId = String(formData.get("organizationId") || before.organizationId || current.organizationId || DEFAULT_ORGANIZATION_ID);
  }

  const organization = await db.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
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
  if (password && !canResetManagedUserPassword(current)) redirect("/admin/organization");

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
      redirect("/admin/organization?userStatus=duplicate");
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
  redirect("/admin/organization?userStatus=saved");
}

export default async function AdminOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string; error?: string; userStatus?: string }>;
}) {
  const user = await requireUser();
  if (!canManageOrganization(user) && !canManagePlantProfile(user)) redirect("/dashboard");
  const canEditCompany = canManageCompanyOrganization(user);
  const canEditPlant = canManagePlantProfile(user);
  const drawerOrganizationId = user.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const [
    organization,
    plantProfile,
    scope,
    organizationTree,
    query,
    drawerOrganizations,
    drawerPlants,
    drawerCategories,
  ] = await Promise.all([
    readOrganizationProfile(user.organizationId || DEFAULT_ORGANIZATION_ID),
    readPlantProfile(user.plantId),
    readOrganizationScopeForUser(user),
    db.organization.findMany({
      where: user.role === RoleName.ADMIN
        ? { active: true }
        : { id: user.organizationId ?? DEFAULT_ORGANIZATION_ID, active: true },
      include: {
        users: {
          where: { role: RoleName.ORGANIZATION_ADMIN, active: true },
          include: { category: true, categories: { include: { category: true } }, signature: true, profilePhoto: true },
          orderBy: { fullName: "asc" },
        },
        plants: {
          where: canEditCompany ? {} : { id: user.plantId ?? "" },
          include: {
            users: {
              where: { active: true },
              include: { category: true, categories: { include: { category: true } }, signature: true, profilePhoto: true },
              orderBy: [{ role: "asc" }, { fullName: "asc" }],
            },
            _count: { select: { users: true, works: true, zones: true } },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    searchParams,
    user.role === RoleName.ADMIN
      ? db.organization.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : db.organization.findMany({
          where: { id: drawerOrganizationId, active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
    user.role === RoleName.ADMIN
      ? db.plant.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, organizationId: true },
        })
      : getActivePlantsForScope(drawerOrganizationId).then((items) => items.map((item) => ({ ...item, organizationId: drawerOrganizationId }))),
    user.role === RoleName.ADMIN
      ? db.category.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, organizationId: true, plantId: true },
        })
      : getActiveCategoriesForPlantScope(user.plantId, drawerOrganizationId).then((items) => items.map((item) => ({ ...item, organizationId: drawerOrganizationId, plantId: user.plantId ?? null }))),
  ]);
  const totalSites = organizationTree.reduce((sum, item) => sum + item.plants.length, 0);
  const visibleProfileName = canEditCompany ? organization.companyName : plantProfile.displayName;
  const visibleHasLogo = canEditCompany ? organization.hasLogo : plantProfile.hasLogo;
  const visibleLogoSrc = canEditCompany
    ? `/organization-logo?organizationId=${encodeURIComponent(organization.organizationId ?? "")}`
    : `/organization-logo?plantId=${encodeURIComponent(plantProfile.plantId)}`;
  const userPermissions = {
    canCreate: canCreateManagedUser(user),
    canUpdate: canUpdateManagedUser(user),
    canResetPassword: canResetManagedUserPassword(user),
    canAssignRole: canAssignManagedUserRole(user),
    canAssignPlant: canAssignManagedUserPlant(user),
    canAssignCategories: canAssignManagedUserCategories(user),
    canDeactivate: canDeactivateManagedUser(user),
  };

  return (
    <AppShell>
      <header>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
          <Building2 aria-hidden="true" size={17} />
          Admin Organization
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">ข้อมูลองค์กร</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          จัดการข้อมูลบริษัท โลโก้ และโครงสร้าง Organization / Site สำหรับใช้งานในเอกสารปิดงานและระบบหลายองค์กร
        </p>
      </header>

      <AdminStructureTabs activeTab="organization" />

      {query.saved === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          บันทึกข้อมูลองค์กรเรียบร้อยแล้ว
        </p>
      ) : null}
      {query.error === "1" ? (
        <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          บันทึกไม่สำเร็จ กรุณาตรวจสอบชื่อบริษัทและไฟล์โลโก้
        </p>
      ) : null}

      {query.created === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          Organization created successfully. You can now create an Organization Admin for it.
        </p>
      ) : null}
      {query.created === "duplicate" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Organization name or code already exists.
        </p>
      ) : null}
      {query.userStatus === "created" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          สร้าง User จาก Organization Site Map เรียบร้อยแล้ว
        </p>
      ) : null}
      {query.userStatus === "duplicate" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Username นี้มีอยู่แล้ว กรุณาใช้ชื่ออื่น
        </p>
      ) : null}
      {query.userStatus === "quota" ? (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          Site นี้มีจำนวน User ถึงโควตาที่กำหนดไว้แล้ว
        </p>
      ) : null}
      {query.userStatus === "orgRequired" ? (
        <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          ไม่พบ Organization สำหรับสร้าง User กรุณาตรวจสอบข้อมูลอีกครั้ง
        </p>
      ) : null}

      {user.role === RoleName.ADMIN ? (
        <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                <PlusCircle aria-hidden="true" size={17} />
                Owner Admin
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">Create Organization</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create the company/customer first. After that, create its Organization Admin from Admin Users.
              </p>
            </div>
            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold text-[var(--muted)]">{organizationTree.length} organizations</span>
          </div>
          <form aria-label="Create organization" action={createOrganizationAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              Organization name
              <input name="name" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" placeholder="Rungtiva Biomass Company Limited" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Organization code
              <input name="slug" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" placeholder="rtb" />
            </label>
            <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
              Create Organization
            </button>
          </form>
        </section>
      ) : null}

      <OrganizationSiteMap
        categories={drawerCategories}
        createUserAction={createOrganizationMapUserAction}
        organizationName={scope.organization.name}
        organizations={drawerOrganizations}
        organizationTree={organizationTree}
        plants={drawerPlants}
        roleOptions={getRoleOptionsForUserManager(user.role)}
        totalSites={totalSites}
        updateUserAction={updateOrganizationMapUserAction}
        userPermissions={userPermissions}
        viewerRole={user.role}
      />

      <section className="mt-6 grid max-w-5xl gap-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:grid-cols-[260px_minmax(0,1fr)] md:p-6">
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
          {visibleHasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`${visibleProfileName} logo`} className="max-h-44 w-full object-contain" src={visibleLogoSrc} />
          ) : (
            <div className="text-center text-[var(--muted)]">
              <ImageIcon aria-hidden="true" className="mx-auto" size={42} />
              <p className="mt-3 font-semibold">ยังไม่มีโลโก้</p>
            </div>
          )}
        </div>

        <form action={updateOrganizationAction} className="grid content-start gap-5">
          <div className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อ Organization ในระบบ
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={scope.organization.name}
                disabled={!canEditCompany}
                maxLength={200}
                name="organizationName"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              รหัส Organization
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={scope.organization.slug}
                disabled={!canEditCompany}
                maxLength={80}
                name="organizationSlug"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อ Site
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={plantProfile.plantName}
                disabled={!canEditPlant}
                maxLength={200}
                name="plantName"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              รหัส Site
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                defaultValue={plantProfile.plantCode}
                disabled={!canEditPlant}
                maxLength={80}
                name="plantCode"
                required
              />
            </label>
            <p className="text-xs text-[var(--muted)] md:col-span-2">
              {canEditCompany
                ? "ข้อมูลส่วนนี้ใช้เป็นค่าเริ่มต้นระดับ Organization"
                : "Site Admin แก้ได้เฉพาะชื่อและข้อมูลของ Site ตัวเองเท่านั้น"}
            </p>
          </div>

          {canEditCompany ? (
            <label className="grid gap-2 text-sm font-semibold">
              ชื่อบริษัท / Organization Profile
              <input
                className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--soft)] px-4 text-base"
                defaultValue={organization.companyName}
                disabled={!canEditCompany}
                maxLength={200}
                name="companyName"
                required
              />
            </label>
          ) : (
            <div className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4">
              <label className="grid gap-2 text-sm font-semibold">
                ชื่อบริษัทที่แสดงบน Dashboard ของ Site
                <input
                  className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                  defaultValue={plantProfile.companyName ?? plantProfile.plantName}
                  maxLength={200}
                  name="siteCompanyName"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                ที่อยู่บริษัท / Site
                <textarea
                  className="min-h-24 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base"
                  defaultValue={plantProfile.address ?? ""}
                  maxLength={500}
                  name="siteAddress"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  ผู้ติดต่อ
                  <input
                    className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                    defaultValue={plantProfile.contactName ?? ""}
                    maxLength={160}
                    name="siteContactName"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  เบอร์ติดต่อ
                  <input
                    className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-base"
                    defaultValue={plantProfile.contactPhone ?? ""}
                    maxLength={80}
                    name="siteContactPhone"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                หมายเหตุ / รายละเอียดเพิ่มเติม
                <textarea
                  className="min-h-24 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base"
                  defaultValue={plantProfile.notes ?? ""}
                  maxLength={1000}
                  name="siteNotes"
                />
              </label>
            </div>
          )}
          <label className="grid gap-2 text-sm font-semibold">
            {canEditCompany ? "อัปโหลดโลโก้บริษัท" : "อัปโหลดโลโก้ Site"}
            <input
              accept="image/png,image/jpeg,image/webp"
              className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--soft)] p-2"
              disabled={canEditCompany ? !canEditCompany : !canEditPlant}
              name={canEditCompany ? "logo" : "plantLogo"}
              type="file"
            />
            <span className="font-normal text-[var(--muted)]">รองรับ PNG, JPG และ WebP ขนาดไม่เกิน 2 MB ไฟล์ใหม่จะแทนที่ไฟล์เดิม</span>
          </label>
          <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
            <Save aria-hidden="true" size={18} />
            {canEditCompany ? "บันทึกข้อมูลองค์กร" : "บันทึกข้อมูล Site"}
          </button>
        </form>
      </section>
    </AppShell>
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
    ? options.filter((option) => option.value !== RoleName.SITE_ADMIN && option.value !== RoleName.ORGANIZATION_ADMIN)
    : options;
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

async function assertPlantInsideOrganization(plantId: string, organizationId: string) {
  const plant = await db.plant.findFirst({
    where: { id: plantId, organizationId },
    select: { id: true },
  });
  if (!plant) redirect("/admin/organization");
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
  if (categories.length !== uniqueIds.length) redirect("/admin/organization");
}
