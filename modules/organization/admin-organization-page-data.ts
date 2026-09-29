import { db } from "../../lib/db";
import {
  getActiveCategoriesForPlantScope,
  getActivePlantsForScope,
} from "../../lib/query-cache";
import type { requireUser } from "../../lib/session";
import {
  canManageCompanyOrganization,
  canManagePlantProfile,
} from "../auth/permission";
import {
  canUseUserPermission,
  PermissionKey,
} from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  canAssignManagedUserCategories,
  canAssignManagedUserPlant,
  canAssignManagedUserRole,
  canCreateManagedUser,
  canDeactivateManagedUser,
  canResetManagedUserPassword,
  canUpdateManagedUser,
} from "../users/user-admin-scope";
import { getOrganizationMapRoleOptions } from "../users/admin-user-page-model";
import { DEFAULT_ORGANIZATION_ID } from "./organization-foundation";
import { readOrganizationProfile } from "./organization-service";
import { readOrganizationScope } from "./organization-scope-service";
import { readPlantProfile } from "./plant-profile-service";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

export type AdminOrganizationQuery = {
  created?: string;
  saved?: string;
  error?: string;
  userStatus?: string;
};

export async function loadAdminOrganizationPageData(
  user: AuthenticatedUser,
  query: AdminOrganizationQuery,
) {
  const canEditCompany = canManageCompanyOrganization(user);
  const canEditPlant = canManagePlantProfile(user);
  const drawerOrganizationId =
    user.organizationId ?? DEFAULT_ORGANIZATION_ID;
  const [
    organization,
    plantProfile,
    scope,
    organizationTree,
    drawerOrganizations,
    drawerPlants,
    drawerCategories,
  ] = await Promise.all([
    readOrganizationProfile(user.organizationId || DEFAULT_ORGANIZATION_ID),
    readPlantProfile(user.plantId),
    readOrganizationScopeForUser(user),
    db.organization.findMany({
      where:
        user.role === RoleName.ADMIN
          ? { active: true }
          : {
              id: user.organizationId ?? DEFAULT_ORGANIZATION_ID,
              active: true,
            },
      include: {
        users: {
          where: { role: RoleName.ORGANIZATION_ADMIN, active: true },
          include: {
            category: true,
            categories: { include: { category: true } },
            signature: true,
            profilePhoto: true,
            inventoryScopes: true,
          },
          orderBy: { fullName: "asc" },
        },
        plants: {
          where: canEditCompany ? {} : { id: user.plantId ?? "" },
          include: {
            users: {
              where: { active: true },
              include: {
                category: true,
                categories: { include: { category: true } },
                signature: true,
                profilePhoto: true,
                inventoryScopes: true,
              },
              orderBy: [{ role: "asc" }, { fullName: "asc" }],
            },
            _count: { select: { users: true, works: true, zones: true } },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
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
      : getActivePlantsForScope(drawerOrganizationId).then((items) =>
          items.map((item) => ({
            ...item,
            organizationId: drawerOrganizationId,
          })),
        ),
    user.role === RoleName.ADMIN
      ? db.category.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            organizationId: true,
            plantId: true,
          },
        })
      : getActiveCategoriesForPlantScope(
          user.plantId,
          drawerOrganizationId,
        ).then((items) =>
          items.map((item) => ({
            ...item,
            organizationId: drawerOrganizationId,
            plantId: user.plantId ?? null,
          })),
        ),
  ]);

  return {
    user,
    query,
    organization,
    plantProfile,
    scope,
    organizationTree,
    drawerOrganizations,
    drawerPlants,
    drawerCategories,
    canEditCompany,
    canEditPlant,
    visibleProfileName: canEditCompany
      ? organization.companyName
      : plantProfile.displayName,
    visibleHasLogo: canEditCompany
      ? organization.hasLogo
      : plantProfile.hasLogo,
    visibleLogoSrc: canEditCompany
      ? `/organization-logo?organizationId=${encodeURIComponent(organization.organizationId ?? "")}`
      : `/organization-logo?plantId=${encodeURIComponent(plantProfile.plantId)}`,
    roleOptions: getOrganizationMapRoleOptions(user.role),
    userPermissions: {
      canCreate: canCreateManagedUser(user),
      canUpdate: canUpdateManagedUser(user),
      canResetPassword: canResetManagedUserPassword(user),
      canAssignRole: canAssignManagedUserRole(user),
      canAssignPlant: canAssignManagedUserPlant(user),
      canAssignCategories: canAssignManagedUserCategories(user),
      canAssignInventory: canUseUserPermission(
        user,
        PermissionKey.ASSIGN_INVENTORY_RESPONSIBILITY,
      ),
      canDeactivate: canDeactivateManagedUser(user),
    },
  };
}

export type AdminOrganizationPageData = Awaited<
  ReturnType<typeof loadAdminOrganizationPageData>
>;

export async function readOrganizationScopeForUser(user: {
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
