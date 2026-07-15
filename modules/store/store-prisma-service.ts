import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { canUseUserPermission, PermissionKey, type PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { recordAudit } from "../audit/audit-service";
import {
  createSparePartWithRepository,
  normalizeSparePartInput,
  type CreateSparePartInput,
  type SparePartRepository,
} from "./store-spare-part-service";
import type { StoreScope } from "./store-types";
import { normalizeStoreSiteCode } from "./store-numbering";

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
  const plant = await db.plant.update({
    where: { id: scope.plantId },
    data: { inventoryCode },
    select: { id: true, inventoryCode: true },
  });
  await auditStoreChange(actor.id, { ...scope, plantCode: inventoryCode }, "Plant", plant.id, "UPDATE_STORE_SITE_CODE", {
    inventoryCode,
  });
  return plant;
}

export async function createStoreCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  name: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const normalizedName = requiredText(name, "Store category name");
  await assertUniqueName("storeCategory", scope.plantId, normalizedName);

  const category = await db.storeCategory.create({
    data: { organizationId: scope.organizationId, plantId: scope.plantId, name: normalizedName },
  });
  await auditStoreChange(actor.id, scope, "StoreCategory", category.id, "CREATE_STORE_CATEGORY", {
    name: category.name,
  });
  return category;
}

export async function createSparePartCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: { code: string; name: string; active?: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Spare part category name");
  const code = normalizeMasterCode(input.code, "Spare part category code");
  await assertUniqueSparePartCategory(scope.plantId, { code, name });

  const category = await db.sparePartCategory.create({
    data: {
      organizationId: scope.organizationId,
      plantId: scope.plantId,
      code,
      name,
      active: input.active ?? true,
    },
  });
  await auditStoreChange(actor.id, scope, "SparePartCategory", category.id, "CREATE_SPARE_PART_CATEGORY", {
    code: category.code,
    name: category.name,
  });
  return category;
}

export async function updateSparePartCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: { code: string; name: string; active: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Spare part category name");
  const code = normalizeMasterCode(input.code, "Spare part category code");
  await db.sparePartCategory.findFirstOrThrow({ where: { id, plantId: scope.plantId } });
  await assertUniqueSparePartCategory(scope.plantId, { code, name }, id);
  const updated = await db.sparePartCategory.update({ where: { id }, data: { code, name, active: input.active } });
  await auditStoreChange(actor.id, scope, "SparePartCategory", id, "UPDATE_SPARE_PART_CATEGORY", {
    code,
    name,
    active: input.active,
  });
  return updated;
}

export async function deleteSparePartCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const category = await db.sparePartCategory.findFirstOrThrow({
    where: { id, plantId: scope.plantId },
    include: { _count: { select: { spareParts: true } } },
  });
  if (category._count.spareParts) {
    throw new Error("This spare part category is already in use. Set it to inactive instead.");
  }
  await db.sparePartCategory.delete({ where: { id } });
  await auditStoreChange(actor.id, scope, "SparePartCategory", id, "DELETE_SPARE_PART_CATEGORY", {
    code: category.code,
    name: category.name,
  });
}

export async function createSparePartType(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: { code: string; name: string; active?: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const code = normalizeMasterCode(input.code, "Spare part type code");
  const name = requiredText(input.name, "Spare part type name");
  await assertUniqueSparePartType(scope.plantId, { code, name });
  const created = await db.sparePartType.create({
    data: { organizationId: scope.organizationId, plantId: scope.plantId, code, name, active: input.active ?? true },
  });
  await auditStoreChange(actor.id, scope, "SparePartType", created.id, "CREATE_SPARE_PART_TYPE", {
    code,
    name,
  });
  return created;
}

export async function updateSparePartType(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: { code: string; name: string; active: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const code = normalizeMasterCode(input.code, "Spare part type code");
  const name = requiredText(input.name, "Spare part type name");
  await db.sparePartType.findFirstOrThrow({ where: { id, plantId: scope.plantId } });
  await assertUniqueSparePartType(scope.plantId, { code, name }, id);
  const updated = await db.sparePartType.update({ where: { id }, data: { code, name, active: input.active } });
  await auditStoreChange(actor.id, scope, "SparePartType", id, "UPDATE_SPARE_PART_TYPE", {
    code,
    name,
    active: input.active,
  });
  return updated;
}

export async function deleteSparePartType(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const type = await db.sparePartType.findFirstOrThrow({
    where: { id, plantId: scope.plantId },
    include: { _count: { select: { spareParts: true } } },
  });
  if (type._count.spareParts) {
    throw new Error("This spare part type is already in use. Set it to inactive instead.");
  }
  await db.sparePartType.delete({ where: { id } });
  await auditStoreChange(actor.id, scope, "SparePartType", id, "DELETE_SPARE_PART_TYPE", {
    code: type.code,
    name: type.name,
  });
}

export async function createStore(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: { name: string; code: string; categoryId?: string | null; location?: string | null },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Store name");
  const code = requiredText(input.code, "Store code").toUpperCase();
  const categoryId = optionalText(input.categoryId);
  if (categoryId) {
    await db.storeCategory.findFirstOrThrow({ where: { id: categoryId, plantId: scope.plantId, active: true } });
  }
  const duplicate = await db.store.findFirst({
    where: { plantId: scope.plantId, OR: [{ name }, { code }] },
    select: { id: true },
  });
  if (duplicate) throw new Error("Store name or code already exists in this Site.");

  const store = await db.store.create({
    data: {
      organizationId: scope.organizationId,
      plantId: scope.plantId,
      categoryId,
      name,
      code,
      location: optionalText(input.location),
    },
  });
  await auditStoreChange(actor.id, scope, "Store", store.id, "CREATE_STORE", {
    name: store.name,
    code: store.code,
  });
  return store;
}

export async function updateStore(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: { name: string; code: string; categoryId?: string | null; location?: string | null; active: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Store name");
  const code = normalizeMasterCode(input.code, "Store code");
  const categoryId = optionalText(input.categoryId);
  await db.store.findFirstOrThrow({ where: { id, plantId: scope.plantId } });
  if (categoryId) {
    await db.storeCategory.findFirstOrThrow({ where: { id: categoryId, plantId: scope.plantId, active: true } });
  }
  const duplicate = await db.store.findFirst({
    where: { id: { not: id }, plantId: scope.plantId, OR: [{ name }, { code }] },
    select: { id: true },
  });
  if (duplicate) throw new Error("Store name or code already exists in this Site.");
  const updated = await db.store.update({
    where: { id },
    data: { name, code, categoryId, location: optionalText(input.location), active: input.active },
  });
  await auditStoreChange(actor.id, scope, "Store", id, "UPDATE_STORE", {
    code,
    name,
    active: input.active,
  });
  return updated;
}

export async function deleteStore(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_STORE);
  assertActorStoreScope(actor, scope);
  const store = await db.store.findFirstOrThrow({
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
  const usageCount = Object.values(store._count).reduce((sum, value) => sum + value, 0);
  if (usageCount) throw new Error("This Store is already in use. Set it to inactive instead.");
  await db.store.delete({ where: { id } });
  await auditStoreChange(actor.id, scope, "Store", id, "DELETE_STORE", {
    code: store.code,
    name: store.name,
  });
}

export async function updateStoreApplicableZones(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  assignments: Array<{ zoneId: string; code: string; active: boolean }>,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);

  const normalized = assignments
    .filter((assignment) => assignment.active || assignment.code.trim())
    .map((assignment) => ({
      zoneId: requiredText(assignment.zoneId, "Zone"),
      code: normalizeMasterCode(assignment.code, "Applicable Zone code"),
      active: assignment.active,
    }));
  const zoneIds = normalized.map((assignment) => assignment.zoneId);
  const codes = normalized.map((assignment) => assignment.code);
  if (new Set(zoneIds).size !== zoneIds.length) throw new Error("Zone must not be duplicated.");
  if (new Set(codes).size !== codes.length) throw new Error("Applicable Zone code must not be duplicated in the same Site.");

  await db.$transaction(async (tx) => {
    const zoneCount = await tx.zone.count({
      where: { id: { in: zoneIds }, plantId: scope.plantId, active: true },
    });
    if (zoneCount !== zoneIds.length) throw new Error("Applicable Zone must belong to the selected Site.");

    for (const assignment of normalized) {
      await tx.storeApplicableZone.upsert({
        where: { plantId_zoneId: { plantId: scope.plantId, zoneId: assignment.zoneId } },
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
  });

  await auditStoreChange(actor.id, scope, "Plant", scope.plantId, "UPDATE_STORE_APPLICABLE_ZONES", {
    assignments: normalized,
  });
}

export async function createSparePart(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: CreateSparePartInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);

  const sparePart = await db.$transaction(async (tx) => {
    await tx.plant.findFirstOrThrow({ where: { id: scope.plantId, organizationId: scope.organizationId, active: true } });
    const normalized = normalizeSparePartInput(input);
    await assertSparePartMasterData(tx, scope, normalized);
    await assertUniqueItemCode(tx, scope.organizationId, normalized.itemCode);
    const repository: SparePartRepository = {
      async reserveNextNumber(plantId) {
        const sequence = await tx.sparePartSequence.upsert({
          where: { plantId },
          update: { lastNumber: { increment: 1 } },
          create: { plantId, lastNumber: 1 },
          select: { lastNumber: true },
        });
        return sequence.lastNumber;
      },
      async createSparePart(data) {
        return tx.sparePart.create({
          data: {
            organizationId: data.organizationId,
            plantId: data.plantId,
            code: data.code,
            itemCode: data.itemCode,
            name: data.name,
            description: data.description,
            unit: data.unit,
            categoryId: data.categoryId,
            typeId: data.typeId,
            defaultStoreId: data.defaultStoreId,
            minStock: data.minStock,
            maxStock: data.maxStock,
            reorderPoint: data.reorderPoint,
            latestUnitPrice: data.latestUnitPrice,
            active: data.active,
          },
          select: { id: true, code: true },
        });
      },
    };

    return createSparePartWithRepository(repository, scope, input);
  });

  await auditStoreChange(actor.id, scope, "SparePart", sparePart.id, "CREATE_SPARE_PART", {
    code: sparePart.code,
    name: input.name.trim(),
  });
  return sparePart;
}

export async function updateSparePart(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  sparePartId: string,
  input: CreateSparePartInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const normalized = normalizeSparePartInput(input);

  const sparePart = await db.$transaction(async (tx) => {
    const existing = await tx.sparePart.findFirstOrThrow({
      where: { id: sparePartId, organizationId: scope.organizationId, plantId: scope.plantId },
      select: { id: true, categoryId: true, typeId: true, defaultStoreId: true },
    });
    await assertSparePartMasterData(tx, scope, normalized, {
      categoryId: existing.categoryId,
      typeId: existing.typeId,
      defaultStoreId: existing.defaultStoreId,
    });
    await assertUniqueItemCode(tx, scope.organizationId, normalized.itemCode, sparePartId);
    return tx.sparePart.update({
      where: { id: sparePartId },
      data: {
        itemCode: normalized.itemCode,
        name: normalized.name,
        description: normalized.description,
        unit: normalized.unit,
        categoryId: normalized.categoryId,
        typeId: normalized.typeId,
        defaultStoreId: normalized.defaultStoreId,
        minStock: normalized.minStock,
        maxStock: normalized.maxStock,
        reorderPoint: normalized.reorderPoint,
        latestUnitPrice: normalized.latestUnitPrice,
        active: normalized.active,
      },
      select: { id: true, code: true, name: true },
    });
  });

  await auditStoreChange(actor.id, scope, "SparePart", sparePart.id, "UPDATE_SPARE_PART", {
    code: sparePart.code,
    name: sparePart.name,
  });
  return sparePart;
}

export async function deleteSparePart(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  sparePartId: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);

  const sparePart = await db.$transaction(async (tx) => {
    await tx.sparePart.findFirstOrThrow({
      where: { id: sparePartId, organizationId: scope.organizationId, plantId: scope.plantId, active: true },
      select: { id: true },
    });
    return tx.sparePart.update({
      where: { id: sparePartId },
      data: { active: false },
      select: { id: true, code: true, name: true },
    });
  });

  await auditStoreChange(actor.id, scope, "SparePart", sparePart.id, "DELETE_SPARE_PART", {
    code: sparePart.code,
    name: sparePart.name,
  });
  return sparePart;
}

export function requireStorePermission(user: PermissionUserContext, permission: PermissionKey) {
  if (!canUseUserPermission(user, permission)) {
    throw new Error("You do not have permission to perform this Store action.");
  }
}

export function assertActorStoreScope(
  actor: PermissionUserContext,
  scope: Pick<StoreScope, "organizationId" | "plantId">,
) {
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId && actor.organizationId !== scope.organizationId) {
    throw new Error("Selected Store is outside your Organization.");
  }
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) {
    throw new Error("Selected Store is outside your Site.");
  }
}

async function assertUniqueName(
  model: "storeCategory" | "sparePartCategory",
  plantId: string,
  name: string,
) {
  const duplicate =
    model === "storeCategory"
      ? await db.storeCategory.findFirst({ where: { plantId, name }, select: { id: true } })
      : await db.sparePartCategory.findFirst({ where: { plantId, name }, select: { id: true } });
  if (duplicate) throw new Error("This name already exists in the selected Site.");
}

async function assertUniqueSparePartCategory(
  plantId: string,
  input: { code: string; name: string },
  excludeId?: string,
) {
  const duplicate = await db.sparePartCategory.findFirst({
    where: {
      plantId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ code: input.code }, { name: input.name }],
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("Spare part category code or name already exists in this Site.");
}

async function assertUniqueSparePartType(
  plantId: string,
  input: { code: string; name: string },
  excludeId?: string,
) {
  const duplicate = await db.sparePartType.findFirst({
    where: {
      plantId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ code: input.code }, { name: input.name }],
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("Spare part type code or name already exists in this Site.");
}

async function assertSparePartMasterData(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  input: ReturnType<typeof normalizeSparePartInput>,
  allowInactive?: {
    categoryId: string | null;
    typeId: string | null;
    defaultStoreId: string | null;
  },
) {
  const [category, type, store] = await Promise.all([
    tx.sparePartCategory.findFirst({
      where: {
        id: input.categoryId,
        plantId: scope.plantId,
        ...(input.categoryId === allowInactive?.categoryId ? {} : { active: true }),
      },
      select: { id: true },
    }),
    tx.sparePartType.findFirst({
      where: {
        id: input.typeId,
        plantId: scope.plantId,
        ...(input.typeId === allowInactive?.typeId ? {} : { active: true }),
      },
      select: { id: true },
    }),
    tx.store.findFirst({
      where: {
        id: input.defaultStoreId,
        plantId: scope.plantId,
        ...(input.defaultStoreId === allowInactive?.defaultStoreId ? {} : { active: true }),
      },
      select: { id: true },
    }),
  ]);
  if (!category || !type || !store) {
    throw new Error("Store, spare part type, and category must be active and belong to the selected Site.");
  }
}

async function assertUniqueItemCode(
  tx: Prisma.TransactionClient,
  organizationId: string,
  itemCode: string,
  excludeId?: string,
) {
  const duplicate = await tx.sparePart.findFirst({
    where: {
      organizationId,
      itemCode,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("Item Code already exists in this Organization.");
}

async function auditStoreChange(
  actorId: string,
  scope: StoreScope,
  entityType: string,
  entityId: string,
  action: string,
  after: Record<string, unknown>,
) {
  await recordAudit({
    actorId,
    organizationId: scope.organizationId,
    plantId: scope.plantId,
    entityType,
    entityId,
    action,
    after,
  });
}

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function normalizeMasterCode(value: string, label: string) {
  const normalized = requiredText(value, label).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(normalized)) {
    throw new Error(`${label} may contain letters, numbers, dot, underscore, slash, or hyphen only.`);
  }
  return normalized;
}

function optionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export function isStoreUniqueConstraint(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
