import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { RoleName } from "../cm-work/cm-work-types";
import { PermissionKey } from "./site-admin-permissions";
import { activePermissionPlantWhere, activePermissionTargetWhere } from "./permission-center-policy";
import {
  groupPermissionKeys,
  permissionKeys,
  permissionRoles,
  resolvePermissionPresentation,
  type PermissionCenterMode,
} from "./permission-center-page-model";

export type PermissionCenterQuery = {
  mode?: string;
  organizationId?: string;
  plantId?: string;
  role?: string;
  userId?: string;
  saved?: string;
};

export async function getPermissionCenterPageData(query: PermissionCenterQuery) {
  await requireOwner();
  const mode: PermissionCenterMode = query.mode === "user" ? "user" : "role";
  const [organizations, plants] = await Promise.all([
    db.organization.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.plant.findMany({
      where: activePermissionPlantWhere,
      select: { id: true, code: true, name: true, organization: { select: { name: true } } },
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
    }),
  ]);
  const organizationId = organizations.some((item) => item.id === query.organizationId)
    ? query.organizationId!
    : organizations[0]?.id ?? "";
  const plantId = plants.some((item) => item.id === query.plantId)
    ? query.plantId!
    : plants[0]?.id ?? "";
  const role = permissionRoles.includes(query.role as (typeof permissionRoles)[number])
    ? query.role as (typeof permissionRoles)[number]
    : RoleName.STORE_OFFICER;
  const users = await db.user.findMany({
    where: activePermissionTargetWhere(undefined, plantId),
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
    orderBy: [{ organization: { name: "asc" } }, { fullName: "asc" }],
  });
  const userId = users.some((item) => item.id === query.userId) ? query.userId! : users[0]?.id ?? "";
  const selectedUser = users.find((item) => item.id === userId);
  const effectiveOrganizationId = mode === "role" ? organizationId : selectedUser?.organizationId ?? "";
  const effectiveRole = mode === "role"
    ? role
    : selectedUser?.role === "PLANT_ADMIN" ? RoleName.SITE_ADMIN : selectedUser?.role ?? RoleName.VISITOR;
  const selectedRoleScopeKey = effectiveRole === RoleName.ADMIN ? "SYSTEM" : `ORG:${effectiveOrganizationId}`;
  const roleRows = await db.rolePermissionOverride.findMany({
    where: {
      role: effectiveRole,
      OR: [
        { scopeKey: "SYSTEM" },
        ...(effectiveOrganizationId ? [{ organizationId: effectiveOrganizationId }] : []),
      ],
    },
  });
  const [userRows, inventoryScopeRows] = mode === "user" && userId
    ? await Promise.all([
        db.userPermissionOverride.findMany({ where: { userId } }),
        db.userInventoryScope.findMany({ where: { userId } }),
      ])
    : [[], []];
  const permissionPresentation = resolvePermissionPresentation({
    mode,
    effectiveRole,
    selectedRoleScopeKey,
    effectiveOrganizationId,
    roleRows,
    userRows,
  });
  const visiblePermissionKeys = effectiveRole === RoleName.ADMIN
    ? [PermissionKey.EXECUTE_PM_WORK]
    : permissionKeys;

  return {
    saved: Boolean(query.saved),
    mode,
    organizations,
    organizationId,
    plants,
    plantId,
    role,
    users,
    userId,
    effectiveRole,
    permissionPresentation,
    groupedPermissions: groupPermissionKeys(visiblePermissionKeys),
    inventoryScopeRows,
  };
}

export type PermissionCenterPageData = Awaited<ReturnType<typeof getPermissionCenterPageData>>;

async function requireOwner() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboardcm");
  return user;
}
