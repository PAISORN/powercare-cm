import { db } from "../../lib/db";
import { resolveAdminSiteScope, type AdminSiteScope, type AdminSiteScopeSearch } from "../admin/admin-site-scope";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName, isSiteAdminRole } from "../cm-work/cm-work-types";

export async function resolveStorePageScope(
  user: PermissionUserContext,
  search: AdminSiteScopeSearch = {},
): Promise<AdminSiteScope> {
  if (user.role === RoleName.ADMIN || user.role === RoleName.ORGANIZATION_ADMIN || isSiteAdminRole(user.role)) {
    return resolveAdminSiteScope(user, search);
  }
  if (!user.plantId) throw new Error("Your account is not assigned to a Site.");

  const plant = await db.plant.findFirstOrThrow({
    where: {
      id: user.plantId,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      active: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return {
    organization: plant.organization,
    plant: { id: plant.id, name: plant.name, code: plant.code },
    organizations: [plant.organization],
    plants: [{ id: plant.id, name: plant.name, code: plant.code }],
    canSelectOrganization: false,
    canSelectPlant: false,
  };
}
