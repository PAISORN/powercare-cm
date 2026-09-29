import { db } from "../../lib/db";
import {
  getActiveCategoriesForPlantScope,
  getActivePlantsForScope,
} from "../../lib/query-cache";
import type { requireUser } from "../../lib/session";
import { canUseUserPermission, PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { DEFAULT_ORGANIZATION_ID } from "../organization/organization-foundation";
import { readOrganizationScope } from "../organization/organization-scope-service";
import {
  canAssignManagedUserCategories,
  canAssignManagedUserPlant,
  canAssignManagedUserRole,
  canCreateManagedUser,
  canDeactivateManagedUser,
  canDeleteManagedUser,
  canResetManagedUserPassword,
  canUpdateManagedUser,
  getManageableUserWhere,
} from "./user-admin-scope";
import {
  applyUserDirectoryFilters,
  buildAdminUsersReturnHref,
  getPlantsForUserManager,
  getRoleFilterOptionsForUserManager,
  getRoleOptionsForUserManager,
  normalizeOrganizationFilter,
  normalizeRoleFilter,
  type AdminUsersSearchParams,
} from "./admin-user-page-model";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

export const adminUsersListPositionKey = "admin-users:list";

export async function loadAdminUsersPageData(
  user: AuthenticatedUser,
  query: AdminUsersSearchParams,
) {
  const {
    createStatus,
    deleteStatus,
    organizationId: requestedOrganizationId = "",
    plantId: selectedPlantId = "",
    role: roleFilter = "",
    updateStatus,
  } = query;
  const userWhere = getManageableUserWhere(user);
  const organizations =
    user.role === RoleName.ADMIN
      ? await db.organization.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        })
      : [];
  const selectedOrganizationId =
    user.role === RoleName.ADMIN
      ? normalizeOrganizationFilter(requestedOrganizationId, organizations)
      : (user.organizationId ?? DEFAULT_ORGANIZATION_ID);
  const canFilterByPlant =
    user.role === RoleName.ADMIN || user.role === RoleName.ORGANIZATION_ADMIN;
  const roleFilterOptions = getRoleFilterOptionsForUserManager(user.role);
  const selectedRole = normalizeRoleFilter(roleFilter, roleFilterOptions);
  const filteredUserWhere = applyUserDirectoryFilters(
    userWhere,
    selectedRole,
    canFilterByPlant ? selectedPlantId : "",
    selectedOrganizationId,
  );
  const formOrganizationId =
    selectedOrganizationId ||
    user.organizationId ||
    DEFAULT_ORGANIZATION_ID;
  const formPlantId = selectedPlantId || user.plantId || undefined;

  const [
    users,
    categories,
    plants,
    scope,
    formOrganization,
    createFormPlants,
    createFormCategories,
  ] = await Promise.all([
    db.user.findMany({
      where: filteredUserWhere,
      include: {
        category: true,
        categories: { include: { category: true } },
        plant: true,
        signature: true,
        profilePhoto: true,
        inventoryScopes: true,
      },
      orderBy: { createdAt: "desc" },
    }),
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
      : getActivePlantsForScope(formOrganizationId).then((items) =>
          items.map((item) => ({ ...item, organizationId: formOrganizationId })),
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
      : getActiveCategoriesForPlantScope(formPlantId, formOrganizationId).then(
          (items) =>
            items.map((item) => ({
              ...item,
              organizationId: formOrganizationId,
              plantId: formPlantId ?? null,
            })),
        ),
  ]);

  const organizationName =
    formOrganization?.name ??
    organizations.find(
      (organization) => organization.id === formOrganizationId,
    )?.name ??
    scope.organization.name;
  const visiblePlants = getPlantsForUserManager(user, plants);
  const editFormPlants =
    user.role === RoleName.ADMIN
      ? createFormPlants
      : visiblePlants.map((plant) => ({
          ...plant,
          organizationId: formOrganizationId,
        }));
  const editFormCategories =
    user.role === RoleName.ADMIN
      ? createFormCategories
      : categories.map((category) => ({
          ...category,
          organizationId: formOrganizationId,
          plantId: formPlantId ?? null,
        }));
  const adminUsersReturnHref = buildAdminUsersReturnHref({
    organizationId: selectedOrganizationId,
    role: selectedRole,
    plantId: selectedPlantId,
  });

  return {
    user,
    createStatus,
    deleteStatus,
    updateStatus,
    users,
    categories,
    organizations,
    selectedOrganizationId,
    selectedPlantId,
    selectedRole,
    canFilterByPlant,
    roleFilterOptions,
    formOrganizationId,
    formPlantId,
    createFormPlants,
    createFormCategories,
    organizationName,
    visiblePlants,
    editFormPlants,
    editFormCategories,
    roleOptions: getRoleOptionsForUserManager(user.role),
    defaultCreateUserRole: RoleName.TECHNICIAN,
    adminUsersReturnHref,
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
      canDelete: canDeleteManagedUser(user),
    },
  };
}

export type AdminUsersPageData = Awaited<
  ReturnType<typeof loadAdminUsersPageData>
>;
