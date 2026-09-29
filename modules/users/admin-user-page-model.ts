import {
  isSiteAdminRole,
  RoleName,
  type RoleName as RoleNameValue,
} from "../cm-work/cm-work-types";

export type AdminUsersSearchParams = {
  createStatus?: string;
  deleteStatus?: string;
  organizationId?: string;
  plantId?: string;
  role?: string;
  updateStatus?: string;
};

export function getRoleOptionsForUserManager(role: string) {
  const options = manageableRoleOptions();
  if (role === RoleName.ORGANIZATION_ADMIN) {
    return options.filter(
      (option) => option.value !== RoleName.ORGANIZATION_ADMIN,
    );
  }
  return isSiteAdminRole(role)
    ? options.filter((option) => option.value !== RoleName.SITE_ADMIN)
    : options;
}

export function getRoleFilterOptionsForUserManager(role: string) {
  const options = manageableRoleOptions();
  if (role === RoleName.ADMIN) return options;
  if (role === RoleName.ORGANIZATION_ADMIN) {
    return options.filter(
      (option) => option.value !== RoleName.ORGANIZATION_ADMIN,
    );
  }
  if (isSiteAdminRole(role)) {
    return options.filter(
      (option) =>
        option.value !== RoleName.ORGANIZATION_ADMIN &&
        option.value !== RoleName.SITE_ADMIN,
    );
  }
  return [];
}

export function getOrganizationMapRoleOptions(role: string) {
  const options = manageableRoleOptions();
  if (role === RoleName.ORGANIZATION_ADMIN) {
    return options.filter(
      (option) => option.value !== RoleName.ORGANIZATION_ADMIN,
    );
  }
  return isSiteAdminRole(role)
    ? options.filter(
        (option) =>
          option.value !== RoleName.SITE_ADMIN &&
          option.value !== RoleName.ORGANIZATION_ADMIN,
      )
    : options;
}

export function normalizeRoleFilter(
  role: string,
  options: { value: RoleNameValue; label: string }[],
) {
  return options.some((option) => option.value === role) ? role : "";
}

export function normalizeOrganizationFilter(
  organizationId: string,
  organizations: { id: string }[],
) {
  return organizations.some(
    (organization) => organization.id === organizationId,
  )
    ? organizationId
    : "";
}

export function applyUserDirectoryFilters(
  userWhere: Record<string, unknown>,
  selectedRole: string,
  selectedPlantId: string,
  selectedOrganizationId: string,
) {
  const organizationScoped = selectedOrganizationId
    ? { ...userWhere, organizationId: selectedOrganizationId }
    : userWhere;
  const roleScoped = selectedRole
    ? { ...organizationScoped, role: selectedRole }
    : organizationScoped;
  if (!selectedPlantId || selectedRole === RoleName.ORGANIZATION_ADMIN) {
    return roleScoped;
  }
  return { ...roleScoped, plantId: selectedPlantId };
}

export function getPlantsForUserManager<T extends { id: string }>(
  user: { role: string; plantId?: string | null },
  plants: T[],
) {
  if (!isSiteAdminRole(user.role)) return plants;
  return plants.filter((plant) => plant.id === user.plantId);
}

export function getUserCategoryIds(user: {
  categoryId: string | null;
  categories?: { categoryId: string }[];
}) {
  const ids = [
    ...(user.categoryId ? [user.categoryId] : []),
    ...(user.categories ?? []).map((item) => item.categoryId),
  ];
  return [...new Set(ids)];
}

export function formatUserCategories(user: {
  category?: { name: string } | null;
  categories?: { category: { name: string } }[];
}) {
  const names = [
    ...(user.category?.name ? [user.category.name] : []),
    ...(user.categories ?? []).map((item) => item.category.name),
  ];
  return [...new Set(names)].join(", ");
}

function manageableRoleOptions(): { value: RoleNameValue; label: string }[] {
  return [
    { value: RoleName.ORGANIZATION_ADMIN, label: "Organization Admin" },
    { value: RoleName.SITE_ADMIN, label: "Site Admin" },
    { value: RoleName.ENGINEER, label: "Engineer" },
    { value: RoleName.TECHNICIAN, label: "Technician" },
    { value: RoleName.STORE_OFFICER, label: "Store Officer" },
    { value: RoleName.VISITOR, label: "Visitor" },
  ];
}

export function buildAdminUsersReturnHref(filters: {
  organizationId?: string;
  role?: string;
  plantId?: string;
}) {
  const params = new URLSearchParams();
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.role) params.set("role", filters.role);
  if (filters.plantId) params.set("plantId", filters.plantId);
  return params.size ? `/admin/users?${params.toString()}` : "/admin/users";
}
