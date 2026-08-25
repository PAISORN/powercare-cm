import { RoleName } from "../cm-work/cm-work-types";
import { PermissionKey } from "./site-admin-permissions";

export type PermissionOverrideDecision = "ALLOW" | "DENY";

export function activePermissionTargetWhere(userId: string | undefined, plantId: string) {
  return {
    ...(userId ? { id: userId } : {}),
    active: true,
    OR: [
      { role: RoleName.ADMIN },
      {
        plantId,
        role: { not: RoleName.ADMIN },
        plant: { active: true, organization: { active: true } },
      },
    ],
  };
}

export const activePermissionPlantWhere = {
  active: true,
  organization: { active: true },
} as const;

export function editableUserPermissionKeys(role: string): PermissionKey[] {
  return role === RoleName.ADMIN
    ? [PermissionKey.EXECUTE_PM_WORK]
    : Object.values(PermissionKey);
}

export function buildUserPermissionOverrideRows(input: {
  role: string;
  userId: string;
  grantedById: string;
  decisionFor: (permissionKey: PermissionKey) => string;
  permissionKeys?: PermissionKey[];
}) {
  const editableKeys = new Set(editableUserPermissionKeys(input.role));
  const permissionKeys = input.permissionKeys ?? [...editableKeys];
  return permissionKeys.filter((permissionKey) => editableKeys.has(permissionKey)).flatMap((permissionKey) => {
    const decision = input.decisionFor(permissionKey);
    return decision === "ALLOW" || decision === "DENY"
      ? [{
          userId: input.userId,
          permissionKey,
          decision: decision as PermissionOverrideDecision,
          grantedById: input.grantedById,
        }]
      : [];
  });
}
