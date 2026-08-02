import { db } from "../../lib/db";
import { resolveAdminSiteScope, type AdminSiteScopeSearch } from "../admin/admin-site-scope";
import { isSiteAdminRole, RoleName } from "../cm-work/cm-work-types";
import type { PermissionUserContext } from "../auth/site-admin-permissions";

export async function resolveAssetScope(user: PermissionUserContext, search: AdminSiteScopeSearch = {}) {
  if (user.role === RoleName.ADMIN || user.role === RoleName.ORGANIZATION_ADMIN || isSiteAdminRole(user.role)) {
    return resolveAdminSiteScope(user, search);
  }
  if (!user.plantId) throw new Error("User account is not assigned to a Site");
  const plant = await db.plant.findUniqueOrThrow({ where: { id: user.plantId }, include: { organization: true } });
  return {
    organization: { id: plant.organization.id, name: plant.organization.name, slug: plant.organization.slug },
    plant: { id: plant.id, name: plant.name, code: plant.code },
    organizations: [{ id: plant.organization.id, name: plant.organization.name, slug: plant.organization.slug }],
    plants: [{ id: plant.id, name: plant.name, code: plant.code }],
    canSelectOrganization: false,
    canSelectPlant: false,
  };
}
