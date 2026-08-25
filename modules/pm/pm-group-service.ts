import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { canManagePmGroups } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  normalizePmGroupAssetIds,
  normalizePmGroupCode,
  normalizePmGroupName,
} from "./pm-validation";

export type PmGroupScope = { organizationId: string; plantId: string };

type PmGroupIdentityInput = PmGroupScope & { code: string; name: string };

function requireActorId(actor: PermissionUserContext) {
  if (!actor.id) throw new Error("Authenticated user is required");
  return actor.id;
}

function authorizeScope(actor: PermissionUserContext, scope: PmGroupScope) {
  if (!canManagePmGroups(actor)) throw new Error("You cannot manage PM Groups");
  if (actor.role === RoleName.ADMIN) return;
  if (!actor.organizationId || actor.organizationId !== scope.organizationId) {
    throw new Error("PM Group scope is outside your Organization");
  }
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) {
    throw new Error("PM Group scope is outside your Site");
  }
}

async function requireActiveScope(
  tx: Prisma.TransactionClient,
  actor: PermissionUserContext,
  scope: PmGroupScope,
) {
  authorizeScope(actor, scope);
  await tx.plant.findFirstOrThrow({
    where: {
      id: scope.plantId,
      organizationId: scope.organizationId,
      active: true,
      organization: { active: true },
    },
    select: { id: true },
  });
}

async function requireGroup(tx: Prisma.TransactionClient, scope: PmGroupScope, groupId: string) {
  return tx.pmGroup.findFirstOrThrow({
    where: { id: groupId, plantId: scope.plantId, organizationId: scope.organizationId },
    include: { assets: { select: { assetId: true }, orderBy: { assetId: "asc" } } },
  });
}

async function requireEligibleAssets(tx: Prisma.TransactionClient, plantId: string, assetIds: string[]) {
  if (!assetIds.length) return;
  const eligible = await tx.asset.findMany({
    where: { id: { in: assetIds }, plantId, registrationStatus: "ACTIVE" },
    select: { id: true },
  });
  if (eligible.length !== assetIds.length) {
    throw new Error("Every PM Group Asset must be actively registered in the selected Site");
  }
}

function membershipIds(group: { assets: Array<{ assetId: string }> }) {
  return group.assets.map(({ assetId }) => assetId).sort();
}

async function auditMutation(
  tx: Prisma.TransactionClient,
  actorId: string,
  scope: PmGroupScope,
  groupId: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await tx.auditEvent.create({
    data: {
      actorId,
      organizationId: scope.organizationId,
      plantId: scope.plantId,
      entityType: "PmGroup",
      entityId: groupId,
      action,
      beforeJson: before === undefined ? null : JSON.stringify(before),
      afterJson: after === undefined ? null : JSON.stringify(after),
    },
  });
}

function duplicateCodeError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new Error("PM Group code already exists in this Site");
  }
  throw error;
}

export async function listPmGroups(actor: PermissionUserContext, scope: PmGroupScope) {
  authorizeScope(actor, scope);
  return db.$transaction(async (tx) => {
    await requireActiveScope(tx, actor, scope);
    return tx.pmGroup.findMany({
      where: { organizationId: scope.organizationId, plantId: scope.plantId },
      include: {
        assets: {
          orderBy: { createdAt: "asc" },
          include: { asset: { include: { assetClass: true, assetType: true, zone: true } } },
        },
        _count: { select: { snapshots: true } },
      },
      orderBy: [{ active: "desc" }, { code: "asc" }],
    });
  });
}

export async function listEligiblePmGroupAssets(
  actor: PermissionUserContext,
  scope: PmGroupScope,
  search = "",
) {
  authorizeScope(actor, scope);
  return db.$transaction(async (tx) => {
    await requireActiveScope(tx, actor, scope);
    const term = search.trim();
    return tx.asset.findMany({
      where: {
        plantId: scope.plantId,
        registrationStatus: "ACTIVE",
        ...(term ? { OR: [{ code: { contains: term } }, { nameTh: { contains: term } }, { nameEn: { contains: term } }] } : {}),
      },
      select: {
        id: true,
        code: true,
        nameTh: true,
        nameEn: true,
        operatingStatus: true,
        parentId: true,
        assetClass: { select: { id: true, nameTh: true, nameEn: true } },
        assetType: { select: { id: true, nameTh: true, nameEn: true } },
        zone: { select: { id: true, name: true } },
      },
      orderBy: [{ code: "asc" }, { nameTh: "asc" }],
    });
  });
}

export async function createPmGroup(
  actor: PermissionUserContext,
  input: PmGroupIdentityInput & { assetIds?: readonly string[] },
) {
  const actorId = requireActorId(actor);
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  const code = normalizePmGroupCode(input.code);
  const name = normalizePmGroupName(input.name);
  const assetIds = normalizePmGroupAssetIds(input.assetIds ?? []);
  try {
    return await db.$transaction(async (tx) => {
      await requireActiveScope(tx, actor, scope);
      await requireEligibleAssets(tx, scope.plantId, assetIds);
      const group = await tx.pmGroup.create({
        data: {
          ...scope,
          code,
          name,
          // In a nested composite relation Prisma supplies PmGroupAsset.plantId
          // from the new group. Connect the Asset through its composite identity;
          // posting plantId directly is not part of the nested create input.
          assets: assetIds.length ? {
            create: assetIds.map((assetId) => ({
              asset: { connect: { id_plantId: { id: assetId, plantId: scope.plantId } } },
            })),
          } : undefined,
        },
        include: { assets: { select: { assetId: true }, orderBy: { assetId: "asc" } } },
      });
      await auditMutation(tx, actorId, scope, group.id, "CREATE_PM_GROUP", {
        membershipIds: [],
        scope,
      }, {
        code: group.code,
        name: group.name,
        active: group.active,
        membershipIds: membershipIds(group),
        scope,
      });
      return group;
    });
  } catch (error) {
    duplicateCodeError(error);
  }
}

export async function updatePmGroupIdentity(
  actor: PermissionUserContext,
  input: PmGroupIdentityInput & { groupId: string },
) {
  const actorId = requireActorId(actor);
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  const code = normalizePmGroupCode(input.code);
  const name = normalizePmGroupName(input.name);
  try {
    return await db.$transaction(async (tx) => {
      await requireActiveScope(tx, actor, scope);
      const before = await requireGroup(tx, scope, input.groupId);
      if (before.firstUsedAt && code !== before.code) throw new Error("Used PM Group code cannot be changed");
      const after = await tx.pmGroup.update({
        where: { id_plantId: { id: before.id, plantId: scope.plantId } },
        data: { code, name },
        include: { assets: { select: { assetId: true }, orderBy: { assetId: "asc" } } },
      });
      await auditMutation(tx, actorId, scope, before.id, "UPDATE_PM_GROUP_IDENTITY", {
        code: before.code, name: before.name, membershipIds: membershipIds(before), scope,
      }, {
        code: after.code, name: after.name, membershipIds: membershipIds(after), scope,
      });
      return after;
    });
  } catch (error) {
    duplicateCodeError(error);
  }
}

export async function updatePmGroup(
  actor: PermissionUserContext,
  input: PmGroupIdentityInput & { groupId: string; assetIds: readonly string[] },
) {
  const actorId = requireActorId(actor);
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  const code = normalizePmGroupCode(input.code);
  const name = normalizePmGroupName(input.name);
  const assetIds = normalizePmGroupAssetIds(input.assetIds);
  try {
    return await db.$transaction(async (tx) => {
      await requireActiveScope(tx, actor, scope);
      const before = await requireGroup(tx, scope, input.groupId);
      if (before.firstUsedAt && code !== before.code) throw new Error("Used PM Group code cannot be changed");

      // Validate the complete submitted membership before mutating identity or links.
      await requireEligibleAssets(tx, scope.plantId, assetIds);

      await tx.pmGroup.update({
        where: { id_plantId: { id: before.id, plantId: scope.plantId } },
        data: { code, name },
      });
      await tx.pmGroupAsset.deleteMany({ where: { pmGroupId: before.id, plantId: scope.plantId } });
      if (assetIds.length) {
        await tx.pmGroupAsset.createMany({
          data: assetIds.map((assetId) => ({ pmGroupId: before.id, plantId: scope.plantId, assetId })),
        });
      }

      const after = await requireGroup(tx, scope, before.id);
      await auditMutation(tx, actorId, scope, before.id, "UPDATE_PM_GROUP", {
        code: before.code,
        name: before.name,
        active: before.active,
        membershipIds: membershipIds(before),
        scope,
      }, {
        code: after.code,
        name: after.name,
        active: after.active,
        membershipIds: membershipIds(after),
        scope,
      });
      return after;
    });
  } catch (error) {
    duplicateCodeError(error);
  }
}

export async function replacePmGroupMembership(
  actor: PermissionUserContext,
  input: PmGroupScope & { groupId: string; assetIds: readonly string[] },
) {
  const actorId = requireActorId(actor);
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  const assetIds = normalizePmGroupAssetIds(input.assetIds);
  return db.$transaction(async (tx) => {
    await requireActiveScope(tx, actor, scope);
    const before = await requireGroup(tx, scope, input.groupId);
    await requireEligibleAssets(tx, scope.plantId, assetIds);
    await tx.pmGroupAsset.deleteMany({ where: { pmGroupId: before.id, plantId: scope.plantId } });
    if (assetIds.length) {
      await tx.pmGroupAsset.createMany({
        data: assetIds.map((assetId) => ({ pmGroupId: before.id, plantId: scope.plantId, assetId })),
      });
    }
    const after = await requireGroup(tx, scope, before.id);
    await auditMutation(tx, actorId, scope, before.id, "REPLACE_PM_GROUP_MEMBERSHIP", {
      membershipIds: membershipIds(before), scope,
    }, {
      membershipIds: membershipIds(after), scope,
    });
    return after;
  });
}

export async function setPmGroupActive(
  actor: PermissionUserContext,
  input: PmGroupScope & { groupId: string; active: boolean },
) {
  const actorId = requireActorId(actor);
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  return db.$transaction(async (tx) => {
    await requireActiveScope(tx, actor, scope);
    const before = await requireGroup(tx, scope, input.groupId);
    if (before.active === input.active) return before;
    const after = await tx.pmGroup.update({
      where: { id_plantId: { id: before.id, plantId: scope.plantId } },
      data: { active: input.active },
      include: { assets: { select: { assetId: true }, orderBy: { assetId: "asc" } } },
    });
    await auditMutation(tx, actorId, scope, before.id, input.active ? "ACTIVATE_PM_GROUP" : "DEACTIVATE_PM_GROUP", {
      active: before.active, membershipIds: membershipIds(before), scope,
    }, {
      active: after.active, membershipIds: membershipIds(after), scope,
    });
    return after;
  });
}

export async function deleteUnusedPmGroup(
  actor: PermissionUserContext,
  input: PmGroupScope & { groupId: string },
) {
  const actorId = requireActorId(actor);
  const scope = { organizationId: input.organizationId, plantId: input.plantId };
  return db.$transaction(async (tx) => {
    await requireActiveScope(tx, actor, scope);
    const before = await requireGroup(tx, scope, input.groupId);
    const snapshotCount = await tx.pmPlanGroupSnapshot.count({
      where: { sourcePmGroupId: before.id, plantId: scope.plantId },
    });
    if (snapshotCount > 0) {
      const after = before.active
        ? await tx.pmGroup.update({
            where: { id_plantId: { id: before.id, plantId: scope.plantId } },
            data: { active: false },
            include: { assets: { select: { assetId: true }, orderBy: { assetId: "asc" } } },
          })
        : before;
      if (before.active) {
        await auditMutation(tx, actorId, scope, before.id, "DEACTIVATE_USED_PM_GROUP", {
          active: true, membershipIds: membershipIds(before), scope,
        }, {
          active: false, membershipIds: membershipIds(after), scope,
        });
      }
      return { outcome: "DEACTIVATED" as const, group: after };
    }

    await tx.pmPlanDraftGroup.deleteMany({ where: { pmGroupId: before.id, plantId: scope.plantId } });
    await tx.pmGroup.delete({ where: { id_plantId: { id: before.id, plantId: scope.plantId } } });
    await auditMutation(tx, actorId, scope, before.id, "DELETE_UNUSED_PM_GROUP", {
      code: before.code,
      name: before.name,
      active: before.active,
      membershipIds: membershipIds(before),
      scope,
    }, {
      membershipIds: [],
      scope,
    });
    return { outcome: "DELETED" as const, group: null };
  });
}
