import type { Prisma } from "@prisma/client";
import {
  canUseUserPermission,
  PermissionKey,
  type PermissionUserContext,
} from "../auth/site-admin-permissions";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";
import {
  normalizeMasterCode,
  optionalText,
  requiredText,
} from "./store-master-values";
import { runStoreMutation } from "./store-mutation-prisma";
import { normalizeStoreSiteCode } from "./store-numbering";
import type { StoreScope } from "./store-types";

export async function updateStoreSiteCode(
  actor: PermissionUserContext & { id: string },
  scope: Omit<StoreScope, "plantCode">,
  value: string,
) {
  if (
    !canUseUserPermission(actor, PermissionKey.MANAGE_STORE) &&
    !canUseUserPermission(actor, PermissionKey.MANAGE_SPARE_PARTS)
  ) {
    throw new Error("You do not have permission to configure Store numbering.");
  }
  assertActorStoreScope(actor, scope);
  const inventoryCode = normalizeStoreSiteCode(value);

  return runStoreMutation(actor.id, scope, async (tx) => {
    const plant = await tx.plant.update({
      where: { id: scope.plantId },
      data: { inventoryCode },
      select: { id: true, inventoryCode: true },
    });
    return {
      value: plant,
      audit: {
        entityType: "Plant",
        entityId: plant.id,
        action: "UPDATE_STORE_SITE_CODE",
        after: { inventoryCode },
      },
    };
  });
}

export async function createStoreCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  name: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const normalizedName = requiredText(name, "Store category name");

  return runStoreMutation(actor.id, scope, async (tx) => {
    await assertUniqueStoreCategoryName(tx, scope.plantId, normalizedName);
    const category = await tx.storeCategory.create({
      data: {
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        name: normalizedName,
      },
    });
    return {
      value: category,
      audit: {
        entityType: "StoreCategory",
        entityId: category.id,
        action: "CREATE_STORE_CATEGORY",
        after: { name: category.name },
      },
    };
  });
}

export async function createStore(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: {
    name: string;
    code: string;
    categoryId?: string | null;
    location?: string | null;
  },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Store name");
  const code = normalizeMasterCode(input.code, "Store code");
  const categoryId = optionalText(input.categoryId);

  return runStoreMutation(actor.id, scope, async (tx) => {
    if (categoryId) {
      await tx.storeCategory.findFirstOrThrow({
        where: { id: categoryId, plantId: scope.plantId, active: true },
      });
    }
    const duplicate = await tx.store.findFirst({
      where: { plantId: scope.plantId, OR: [{ name }, { code }] },
      select: { id: true },
    });
    if (duplicate)
      throw new Error("Store name or code already exists in this Site.");

    const store = await tx.store.create({
      data: {
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        categoryId,
        name,
        code,
        location: optionalText(input.location),
      },
    });
    return {
      value: store,
      audit: {
        entityType: "Store",
        entityId: store.id,
        action: "CREATE_STORE",
        after: { name: store.name, code: store.code },
      },
    };
  });
}

export async function updateStore(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: {
    name: string;
    code: string;
    categoryId?: string | null;
    location?: string | null;
    active: boolean;
  },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Store name");
  const code = normalizeMasterCode(input.code, "Store code");
  const categoryId = optionalText(input.categoryId);

  return runStoreMutation(actor.id, scope, async (tx) => {
    await tx.store.findFirstOrThrow({ where: { id, plantId: scope.plantId } });
    if (categoryId) {
      await tx.storeCategory.findFirstOrThrow({
        where: { id: categoryId, plantId: scope.plantId, active: true },
      });
    }
    const duplicate = await tx.store.findFirst({
      where: {
        id: { not: id },
        plantId: scope.plantId,
        OR: [{ name }, { code }],
      },
      select: { id: true },
    });
    if (duplicate)
      throw new Error("Store name or code already exists in this Site.");
    const updated = await tx.store.update({
      where: { id },
      data: {
        name,
        code,
        categoryId,
        location: optionalText(input.location),
        active: input.active,
      },
    });
    return {
      value: updated,
      audit: {
        entityType: "Store",
        entityId: id,
        action: "UPDATE_STORE",
        after: { code, name, active: input.active },
      },
    };
  });
}

export async function deleteStore(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);

  await runStoreMutation(actor.id, scope, async (tx) => {
    const store = await tx.store.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
      include: {
        _count: {
          select: {
            stocks: true,
            movements: true,
            receiveItems: true,
            issueItems: true,
            defaultSpareParts: true,
          },
        },
      },
    });
    const usageCount = Object.values(store._count).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (usageCount)
      throw new Error(
        "This Store is already in use. Set it to inactive instead.",
      );
    await tx.store.delete({ where: { id } });
    return {
      value: undefined,
      audit: {
        entityType: "Store",
        entityId: id,
        action: "DELETE_STORE",
        after: { code: store.code, name: store.name },
      },
    };
  });
}

export async function updateStoreApplicableZones(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  assignments: Array<{ zoneId: string; code: string; active: boolean }>,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const cleaned = assignments.map((assignment) => ({
    zoneId: requiredText(assignment.zoneId, "Zone"),
    code: assignment.code.trim(),
    active: assignment.active,
  }));
  const zoneIds = cleaned.map((assignment) => assignment.zoneId);
  if (new Set(zoneIds).size !== zoneIds.length)
    throw new Error("Zone must not be duplicated.");
  const explicitCodes = cleaned
    .filter((assignment) => assignment.active || assignment.code)
    .filter((assignment) => assignment.code)
    .map((assignment) =>
      normalizeMasterCode(assignment.code, "Applicable Zone code"),
    );
  if (new Set(explicitCodes).size !== explicitCodes.length) {
    throw new Error(
      "Applicable Zone code must not be duplicated in the same Site.",
    );
  }

  await runStoreMutation(actor.id, scope, async (tx) => {
    const zoneCount = await tx.zone.count({
      where: { id: { in: zoneIds }, plantId: scope.plantId, active: true },
    });
    if (zoneCount !== zoneIds.length) {
      throw new Error("Applicable Zone must belong to the selected Site.");
    }
    const reservedAssignments = await tx.storeApplicableZone.findMany({
      where: {
        plantId: scope.plantId,
        ...(zoneIds.length ? { zoneId: { notIn: zoneIds } } : {}),
      },
      select: { code: true },
    });
    const usedCodes = new Set([
      ...explicitCodes,
      ...reservedAssignments.map((assignment) => assignment.code),
    ]);
    const normalized = cleaned
      .filter((assignment) => assignment.active || assignment.code)
      .map((assignment) => {
        const code = assignment.code
          ? normalizeMasterCode(assignment.code, "Applicable Zone code")
          : nextAvailableApplicableZoneCode(usedCodes);
        usedCodes.add(code);
        return { ...assignment, code };
      });

    for (const assignment of normalized) {
      await tx.storeApplicableZone.upsert({
        where: {
          plantId_zoneId: { plantId: scope.plantId, zoneId: assignment.zoneId },
        },
        update: { code: assignment.code, active: assignment.active },
        create: {
          organizationId: scope.organizationId,
          plantId: scope.plantId,
          zoneId: assignment.zoneId,
          code: assignment.code,
          active: assignment.active,
        },
      });
    }
    return {
      value: undefined,
      audit: {
        entityType: "Plant",
        entityId: scope.plantId,
        action: "UPDATE_STORE_APPLICABLE_ZONES",
        after: { assignments: normalized },
      },
    };
  });
}

function nextAvailableApplicableZoneCode(usedCodes: Set<string>) {
  let sequence = 1;
  while (usedCodes.has(String(sequence).padStart(2, "0"))) sequence += 1;
  return String(sequence).padStart(2, "0");
}

async function assertUniqueStoreCategoryName(
  tx: Prisma.TransactionClient,
  plantId: string,
  name: string,
) {
  const duplicate = await tx.storeCategory.findFirst({
    where: { plantId, name },
    select: { id: true },
  });
  if (duplicate)
    throw new Error("This name already exists in the selected Site.");
}
