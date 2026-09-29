import { Prisma } from "@prisma/client";
import {
  canUseUserPermission,
  PermissionKey,
  type PermissionUserContext,
} from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  createSparePartWithRepository,
  normalizeSparePartInput,
  type CreateSparePartInput,
  type SparePartRepository,
} from "./store-spare-part-service";
import type { StoreScope } from "./store-types";
import { hasInventoryResponsibility } from "./inventory-user-scope";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";
import { runStoreMutation } from "./store-mutation-prisma";

export async function createSparePart(
  actor: PermissionUserContext & {
    id: string;
    inventoryScopes?: Array<{
      itemKind: string;
      responsibilityEnabled: boolean;
    }>;
  },
  scope: StoreScope,
  input: CreateSparePartInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const normalized = normalizeSparePartInput(input);
  if (!hasInventoryResponsibility(actor, normalized.itemKind))
    throw new Error("No management scope for this inventory type.");

  return runStoreMutation(actor.id, scope, async (tx) => {
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
            itemKind: data.itemKind,
            name: data.name,
            description: data.description,
            unit: data.unit,
            categoryId: data.categoryId,
            materialGroupId: data.materialGroupId,
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

    const sparePart = await createSparePartWithRepository(
      repository,
      scope,
      input,
    );
    return {
      value: sparePart,
      audit: {
        entityType: "SparePart",
        entityId: sparePart.id,
        action: "CREATE_SPARE_PART",
        after: { code: sparePart.code, name: input.name.trim() },
      },
    };
  });
}

export async function updateSparePart(
  actor: PermissionUserContext & {
    id: string;
    inventoryScopes?: Array<{
      itemKind: string;
      responsibilityEnabled: boolean;
    }>;
  },
  scope: StoreScope,
  sparePartId: string,
  input: CreateSparePartInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const normalized = normalizeSparePartInput(input);

  return runStoreMutation(actor.id, scope, async (tx) => {
    const existing = await tx.sparePart.findFirstOrThrow({
      where: {
        id: sparePartId,
        organizationId: scope.organizationId,
        plantId: scope.plantId,
      },
      select: {
        id: true,
        itemKind: true,
        categoryId: true,
        materialGroupId: true,
        typeId: true,
        defaultStoreId: true,
        latestUnitPrice: true,
      },
    });
    if (!hasInventoryResponsibility(actor, existing.itemKind))
      throw new Error("No management scope for this inventory type.");
    if (
      normalized.itemKind !== existing.itemKind &&
      actor.role !== RoleName.ADMIN
    ) {
      throw new Error("Only Owner Admin can change the inventory item type.");
    }
    await assertSparePartMasterData(tx, scope, normalized, {
      categoryId: existing.categoryId,
      materialGroupId: existing.materialGroupId,
      typeId: existing.typeId,
      defaultStoreId: existing.defaultStoreId,
    });
    await assertUniqueItemCode(
      tx,
      scope.organizationId,
      normalized.itemCode,
      sparePartId,
    );
    const updated = await tx.sparePart.update({
      where: { id: sparePartId },
      data: {
        itemCode: normalized.itemCode,
        itemKind: normalized.itemKind,
        name: normalized.name,
        description: normalized.description,
        unit: normalized.unit,
        categoryId: normalized.categoryId,
        materialGroupId: normalized.materialGroupId,
        typeId: normalized.typeId,
        defaultStoreId: normalized.defaultStoreId,
        minStock: normalized.minStock,
        maxStock: normalized.maxStock,
        reorderPoint: normalized.reorderPoint,
        latestUnitPrice: canUseUserPermission(
          actor,
          PermissionKey.VIEW_STOCK_VALUE,
        )
          ? normalized.latestUnitPrice
          : existing.latestUnitPrice,
        active: normalized.active,
      },
      select: { id: true, code: true, name: true },
    });
    return {
      value: updated,
      audit: {
        entityType: "SparePart",
        entityId: updated.id,
        action: "UPDATE_SPARE_PART",
        after: { code: updated.code, name: updated.name },
      },
    };
  });
}

export async function deleteSparePart(
  actor: PermissionUserContext & {
    id: string;
    inventoryScopes?: Array<{
      itemKind: string;
      responsibilityEnabled: boolean;
    }>;
  },
  scope: StoreScope,
  sparePartId: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);

  return runStoreMutation(actor.id, scope, async (tx) => {
    const existing = await tx.sparePart.findFirstOrThrow({
      where: {
        id: sparePartId,
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        active: true,
      },
      select: { id: true, itemKind: true },
    });
    if (!hasInventoryResponsibility(actor, existing.itemKind))
      throw new Error("No management scope for this inventory type.");
    const sparePart = await tx.sparePart.update({
      where: { id: sparePartId },
      data: { active: false },
      select: { id: true, code: true, name: true },
    });
    return {
      value: sparePart,
      audit: {
        entityType: "SparePart",
        entityId: sparePart.id,
        action: "DELETE_SPARE_PART",
        after: { code: sparePart.code, name: sparePart.name },
      },
    };
  });
}

async function assertSparePartMasterData(
  tx: Prisma.TransactionClient,
  scope: StoreScope,
  input: ReturnType<typeof normalizeSparePartInput>,
  allowInactive?: {
    categoryId: string | null;
    materialGroupId: string | null;
    typeId: string | null;
    defaultStoreId: string | null;
  },
) {
  const [category, materialGroup, type, store] = await Promise.all([
    tx.sparePartCategory.findFirst({
      where: {
        id: input.categoryId,
        plantId: scope.plantId,
        ...(input.categoryId === allowInactive?.categoryId
          ? {}
          : { active: true }),
      },
      select: { id: true },
    }),
    tx.sparePartMaterialGroup.findFirst({
      where: {
        id: input.materialGroupId,
        categoryId: input.categoryId,
        plantId: scope.plantId,
        ...(input.materialGroupId === allowInactive?.materialGroupId
          ? {}
          : { active: true }),
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
        ...(input.defaultStoreId === allowInactive?.defaultStoreId
          ? {}
          : { active: true }),
      },
      select: { id: true },
    }),
  ]);
  if (!category || !materialGroup || !type || !store) {
    throw new Error(
      "Store, spare part type, category, and material group must be active, related, and belong to the selected Site.",
    );
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
  if (duplicate)
    throw new Error("Item Code already exists in this Organization.");
}
