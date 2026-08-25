import { db } from "../../lib/db";
import { resolveAdminSiteScope, type AdminSiteScope, type AdminSiteScopeSearch } from "../admin/admin-site-scope";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

export async function resolvePmPageScope(
  user: PermissionUserContext,
  search: AdminSiteScopeSearch = {},
): Promise<AdminSiteScope> {
  if (user.role === RoleName.ORGANIZATION_ADMIN) {
    if (!user.organizationId) throw new Error("Organization Admin account is not assigned to an Organization.");
    await db.organization.findFirstOrThrow({
      where: { id: user.organizationId, active: true },
      select: { id: true },
    });
    return requireRealActivePmScope(await resolveAdminSiteScope(user, search));
  }
  if (user.role === RoleName.ADMIN) {
    return requireRealActivePmScope(await resolveAdminSiteScope(user, search));
  }
  if (!user.plantId) throw new Error("Your account is not assigned to a Site.");

  const plant = await db.plant.findFirstOrThrow({
    where: {
      id: user.plantId,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      active: true,
      organization: { active: true },
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

function requireRealActivePmScope(scope: AdminSiteScope): AdminSiteScope {
  const organizationIsSelectable = scope.organizations.some(({ id }) => id === scope.organization.id);
  const plantIsSelectable = scope.plants.some(({ id }) => id === scope.plant.id);
  if (!organizationIsSelectable) throw new Error("No active Organization is available for PM.");
  if (!plantIsSelectable) throw new Error("No active Site is available for PM.");
  return scope;
}
