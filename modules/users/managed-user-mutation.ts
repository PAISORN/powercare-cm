import { db } from "../../lib/db";
import {
  deleteStoredFile,
} from "../../lib/file-storage";
import { hashPassword, verifyPassword } from "../../lib/password";
import type { requireUser } from "../../lib/session";
import { recordAudit } from "../audit/audit-service";
import {
  canUsePermission,
  canUseUserPermission,
  PermissionKey,
  type RolePermissionOverrideRecord,
  type SiteAdminPermissionRecord,
  type UserPermissionOverrideRecord,
} from "../auth/site-admin-permissions";
import {
  RoleName,
  type RoleName as RoleNameValue,
} from "../cm-work/cm-work-types";
import { DEFAULT_ORGANIZATION_ID } from "../organization/organization-foundation";
import { readOrganizationScope } from "../organization/organization-scope-service";
import {
  INVENTORY_ITEM_KINDS,
  normalizeInventoryScopeKinds,
  type InventoryItemKind,
} from "../store/inventory-user-scope";
import {
  getUserCategoryIds,
} from "./admin-user-page-model";
import type {
  CreateManagedUserInput,
  DeleteManagedUserInput,
  UpdateManagedUserInput,
} from "./managed-user-mutation-input";
import { stageManagedUserMedia } from "./managed-user-media";
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
  resolveManagedUserPlantId,
} from "./user-admin-scope";
import { isDuplicateUsernameError } from "./user-prisma-errors";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

export type ManagedUserMutationIssue =
  | "approval-scope-required"
  | "duplicate-username"
  | "forbidden"
  | "inventory-scope-required"
  | "invalid-scope"
  | "invalid-target"
  | "invalid-password"
  | "organization-required"
  | "quota";

export class ManagedUserMutationError extends Error {
  constructor(readonly issue: ManagedUserMutationIssue) {
    super(issue);
    this.name = "ManagedUserMutationError";
  }
}

export function getManagedUserMutationIssue(error: unknown) {
  return error instanceof ManagedUserMutationError ? error.issue : null;
}

export function buildInventoryScopeRows(
  responsibilityKinds: readonly InventoryItemKind[],
  approvalKinds: readonly InventoryItemKind[],
) {
  return INVENTORY_ITEM_KINDS.flatMap((itemKind) => {
    const responsibilityEnabled = responsibilityKinds.includes(itemKind);
    const approvalEnabled = approvalKinds.includes(itemKind);
    return responsibilityEnabled || approvalEnabled
      ? [{ itemKind, responsibilityEnabled, approvalEnabled }]
      : [];
  });
}

export function getInventoryScopeRequirementIssue(input: {
  active: boolean;
  approvalAllowed: boolean;
  role: RoleNameValue;
  responsibilityKinds: readonly InventoryItemKind[];
  approvalKinds: readonly InventoryItemKind[];
}): ManagedUserMutationIssue | null {
  if (
    input.active &&
    input.role === RoleName.STORE_OFFICER &&
    input.responsibilityKinds.length === 0
  ) {
    return "inventory-scope-required";
  }
  if (
    input.active &&
    input.approvalAllowed &&
    input.approvalKinds.length === 0
  ) {
    return "approval-scope-required";
  }
  return null;
}

export async function createManagedUser(
  current: AuthenticatedUser,
  input: CreateManagedUserInput,
) {
  if (!canManageUsers(current) || !canCreateManagedUser(current)) {
    throw new ManagedUserMutationError("forbidden");
  }

  const nextRole = assertManagedUserRole(
    current,
    (canAssignManagedUserRole(current)
      ? input.role
      : RoleName.TECHNICIAN) as RoleNameValue,
  );
  const scope = await readOrganizationScope();
  let organizationId = current.organizationId ?? scope.organization.id;
  if (current.role === RoleName.ADMIN) {
    organizationId =
      input.organizationId ?? current.organizationId ?? DEFAULT_ORGANIZATION_ID;
  } else if (current.role === RoleName.ORGANIZATION_ADMIN) {
    organizationId = current.organizationId ?? DEFAULT_ORGANIZATION_ID;
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) {
    throw new ManagedUserMutationError("organization-required");
  }

  const canAssignCategories = canAssignManagedUserCategories(current);
  const canAssignInventory = canUseUserPermission(
    current,
    PermissionKey.ASSIGN_INVENTORY_RESPONSIBILITY,
  );
  const plantId =
    nextRole === RoleName.ORGANIZATION_ADMIN
      ? null
      : canAssignManagedUserPlant(current)
        ? resolveManagedUserPlantId(
            current,
            input.plantId,
          )
        : resolveManagedUserPlantId(current, null);
  const selectedCategoryIds =
    nextRole === RoleName.ORGANIZATION_ADMIN || !plantId
      ? []
      : canAssignCategories
        ? input.categoryIds
        : [];
  const department =
    nextRole === RoleName.ORGANIZATION_ADMIN
      ? organization.name
      : input.department;
  const responsibilityKinds = canAssignInventory
    ? input.inventoryResponsibilityKinds
    : [];
  const approvalKinds = canAssignInventory
    ? input.inventoryApprovalKinds
    : [];
  assertActiveInventoryScopes({
    role: nextRole,
    active: true,
    approvalAllowed: await canManagedUserApproveStoreIssue({
      role: nextRole,
      organizationId,
      plantId,
    }),
    responsibilityKinds,
    approvalKinds,
  });

  await assertManagedUserScope(organizationId, plantId, selectedCategoryIds);
  if (plantId) await assertSiteUserQuota(plantId);

  let created;
  try {
    created = await db.user.create({
      data: {
        username: input.username,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName,
        department,
        role: nextRole,
        organizationId,
        plantId,
        categoryId: selectedCategoryIds[0] ?? null,
        ...(canAssignCategories
          ? {
              categories: {
                create: selectedCategoryIds.map((categoryId) => ({ categoryId })),
              },
            }
          : {}),
        inventoryScopes: {
          create: buildInventoryScopeRows(
            responsibilityKinds,
            approvalKinds,
          ),
        },
        active: true,
      },
    });
  } catch (error) {
    if (isDuplicateUsernameError(error)) {
      throw new ManagedUserMutationError("duplicate-username");
    }
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
      inventoryScopes: buildInventoryScopeRows(
        responsibilityKinds,
        approvalKinds,
      ),
      active: created.active,
    },
  });

  return { userId: created.id };
}

export async function updateManagedUser(
  current: AuthenticatedUser,
  input: UpdateManagedUserInput,
) {
  if (!canManageUsers(current) || !canUpdateManagedUser(current)) {
    throw new ManagedUserMutationError("forbidden");
  }
  const userId = input.userId;
  if (!userId || userId === current.id) {
    throw new ManagedUserMutationError("invalid-target");
  }

  const before = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      signature: true,
      profilePhoto: true,
      categories: true,
      inventoryScopes: true,
      siteAdminPermissions: true,
      userPermissionOverrides: true,
    },
  });
  assertCanManageTargetUser(current, before);

  const scope = await readOrganizationScope();
  let organizationId =
    before.organizationId ?? current.organizationId ?? scope.organization.id;
  const nextRole: RoleNameValue = canAssignManagedUserRole(current)
    ? assertManagedUserRole(
        current,
        input.role,
      )
    : (before.role as RoleNameValue);
  if (
    current.role === RoleName.ADMIN &&
    nextRole !== RoleName.ORGANIZATION_ADMIN
  ) {
    organizationId =
      input.organizationId ??
      before.organizationId ??
      current.organizationId ??
      DEFAULT_ORGANIZATION_ID;
  }
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!organization) {
    throw new ManagedUserMutationError("organization-required");
  }

  const nextPlantId =
    nextRole === RoleName.ORGANIZATION_ADMIN
      ? null
      : canAssignManagedUserPlant(current)
        ? resolveManagedUserPlantId(
            current,
            input.plantId,
          )
        : before.plantId;
  const canAssignCategories = canAssignManagedUserCategories(current);
  const canAssignInventory = canUseUserPermission(
    current,
    PermissionKey.ASSIGN_INVENTORY_RESPONSIBILITY,
  );
  const selectedCategoryIds =
    nextRole === RoleName.ORGANIZATION_ADMIN || !nextPlantId
      ? []
      : canAssignCategories
        ? input.categoryIds
        : getUserCategoryIds(before);
  const department =
    nextRole === RoleName.ORGANIZATION_ADMIN
      ? organization.name
      : input.department;
  const nextActive = canDeactivateManagedUser(current)
    ? input.active
    : before.active;
  const responsibilityKinds = canAssignInventory
    ? input.inventoryResponsibilityKinds
    : normalizeInventoryScopeKinds(
        before.inventoryScopes
          .filter((item) => item.responsibilityEnabled)
          .map((item) => item.itemKind),
      );
  const approvalKinds = canAssignInventory
    ? input.inventoryApprovalKinds
    : normalizeInventoryScopeKinds(
        before.inventoryScopes
          .filter((item) => item.approvalEnabled)
          .map((item) => item.itemKind),
      );
  assertActiveInventoryScopes({
    role: nextRole,
    active: nextActive,
    approvalAllowed: await canManagedUserApproveStoreIssue({
      id: userId,
      role: nextRole,
      organizationId,
      plantId: nextPlantId,
      siteAdminPermissions: before.siteAdminPermissions,
      userPermissionOverrides: before.userPermissionOverrides,
    }),
    responsibilityKinds,
    approvalKinds,
  });
  await assertManagedUserScope(
    organizationId,
    nextPlantId,
    selectedCategoryIds,
  );
  if (
    nextActive &&
    nextPlantId &&
    (!before.active || before.plantId !== nextPlantId)
  ) {
    await assertSiteUserQuota(nextPlantId);
  }

  const password = input.password;
  if (password && !canResetManagedUserPassword(current)) {
    throw new ManagedUserMutationError("forbidden");
  }
  const stagedMedia = await stageManagedUserMedia({
    userId,
    signatureFile: input.signatureFile,
    profilePhotoFile: input.profilePhotoFile,
  });
  const inventoryScopes = buildInventoryScopeRows(
    responsibilityKinds,
    approvalKinds,
  );

  let updated;
  try {
    updated = await db.user.update({
      where: { id: userId },
      data: {
        username: input.username,
        fullName: input.fullName,
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
        inventoryScopes: {
          deleteMany: {},
          create: inventoryScopes,
        },
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
        ...(stagedMedia.signature
          ? {
              signature: {
                upsert: {
                  update: stagedMedia.signature,
                  create: stagedMedia.signature,
                },
              },
            }
          : {}),
        ...(stagedMedia.profilePhoto
          ? {
              profilePhoto: {
                upsert: {
                  update: stagedMedia.profilePhoto,
                  create: stagedMedia.profilePhoto,
                },
              },
            }
          : {}),
      },
      include: { signature: true, profilePhoto: true },
    });
  } catch (error) {
    await stagedMedia.discard();
    if (isDuplicateUsernameError(error)) {
      throw new ManagedUserMutationError("duplicate-username");
    }
    throw error;
  }

  await stagedMedia.finalize({
    signatureStoragePath: before.signature?.storagePath,
    profilePhotoStoragePath: before.profilePhoto?.storagePath,
  });

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
      inventoryScopes: before.inventoryScopes,
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
      inventoryScopes,
      active: updated.active,
      passwordReset: Boolean(password),
      hasSignature: Boolean(updated.signature),
      hasProfilePhoto: Boolean(updated.profilePhoto),
    },
  });

  return { userId };
}

export async function deleteManagedUser(
  current: AuthenticatedUser,
  input: DeleteManagedUserInput,
) {
  if (!canManageUsers(current) || !canDeleteManagedUser(current)) {
    throw new ManagedUserMutationError("forbidden");
  }
  const userId = input.userId;
  if (!userId || userId === current.id) {
    throw new ManagedUserMutationError("invalid-target");
  }

  const currentAdmin = await db.user.findUniqueOrThrow({
    where: { id: current.id },
  });
  const passwordOk = await verifyPassword(
    input.adminPassword,
    currentAdmin.passwordHash,
  );
  if (!passwordOk) {
    throw new ManagedUserMutationError("invalid-password");
  }

  const before = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      signature: true,
      category: true,
      categories: true,
      plant: true,
      profilePhoto: true,
      inventoryScopes: true,
    },
  });
  assertCanManageTargetUser(current, before);

  await db.$transaction([
    db.auditEvent.updateMany({
      where: { actorId: userId },
      data: { actorId: null },
    }),
    db.statusHistory.updateMany({
      where: { changedById: userId },
      data: { changedById: null },
    }),
    db.cmWork.updateMany({
      where: { claimantId: userId },
      data: { claimantId: null },
    }),
    db.cmWork.updateMany({
      where: { reviewerId: userId },
      data: { reviewerId: null },
    }),
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
          organizationId: before.organizationId,
          plantId: before.plantId,
          plantName: before.plant?.name ?? null,
          categoryId: before.categoryId,
          categoryName: before.category?.name ?? null,
          categoryIds: getUserCategoryIds(before),
          inventoryScopes: before.inventoryScopes,
          active: before.active,
          hasSignature: Boolean(before.signature),
          hasProfilePhoto: Boolean(before.profilePhoto),
        }),
      },
    }),
  ]);

  await Promise.all([
    deleteStoredFile(before.profilePhoto?.storagePath),
    deleteStoredFile(before.signature?.storagePath),
  ]);
  return { userId };
}

function assertActiveInventoryScopes(input: {
  active: boolean;
  approvalAllowed: boolean;
  role: RoleNameValue;
  responsibilityKinds: readonly InventoryItemKind[];
  approvalKinds: readonly InventoryItemKind[];
}) {
  const issue = getInventoryScopeRequirementIssue(input);
  if (issue) throw new ManagedUserMutationError(issue);
}

async function canManagedUserApproveStoreIssue(input: {
  id?: string;
  role: RoleNameValue;
  organizationId: string;
  plantId: string | null;
  siteAdminPermissions?: SiteAdminPermissionRecord[];
  userPermissionOverrides?: UserPermissionOverrideRecord[];
}) {
  const rolePermissionOverrides = await db.rolePermissionOverride.findMany({
    where: {
      OR: [
        { scopeKey: "SYSTEM" },
        { organizationId: input.organizationId },
      ],
    },
  });
  return canUsePermission(
    input,
    PermissionKey.APPROVE_STORE_ISSUE,
    input.siteAdminPermissions ?? [],
    rolePermissionOverrides as RolePermissionOverrideRecord[],
    input.userPermissionOverrides ?? [],
  );
}

async function assertManagedUserScope(
  organizationId: string,
  plantId: string | null,
  categoryIds: string[],
) {
  if (plantId) {
    const plant = await db.plant.findFirst({
      where: { id: plantId, organizationId },
      select: { id: true },
    });
    if (!plant) throw new ManagedUserMutationError("invalid-scope");
  }
  if (categoryIds.length && plantId) {
    const uniqueIds = [...new Set(categoryIds)];
    const categories = await db.category.findMany({
      where: {
        id: { in: uniqueIds },
        OR: [{ plantId }, { plantId: null }],
      },
      select: { id: true },
    });
    if (categories.length !== uniqueIds.length) {
      throw new ManagedUserMutationError("invalid-scope");
    }
  }
}

async function assertSiteUserQuota(plantId: string) {
  const site = await db.plant.findUnique({
    where: { id: plantId },
    select: { maxUsers: true },
  });
  if (!site?.maxUsers) return;
  const activeUsers = await db.user.count({ where: { plantId, active: true } });
  if (activeUsers >= site.maxUsers) {
    throw new ManagedUserMutationError("quota");
  }
}
