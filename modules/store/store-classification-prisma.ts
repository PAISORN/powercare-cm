import type { Prisma } from "@prisma/client";
import {
  PermissionKey,
  type PermissionUserContext,
} from "../auth/site-admin-permissions";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";
import { normalizeMasterCode, requiredText } from "./store-master-values";
import { runStoreMutation } from "./store-mutation-prisma";
import type { StoreScope } from "./store-types";

type ClassificationInput = { code: string; name: string; active?: boolean };
type ClassificationUpdateInput = {
  code: string;
  name: string;
  active: boolean;
};

export async function createSparePartCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: ClassificationInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Spare part category name");
  const code = normalizeMasterCode(input.code, "Spare part category code");
  return runStoreMutation(actor.id, scope, async (tx) => {
    await assertUniqueSparePartCategory(tx, scope.plantId, { code, name });
    const category = await tx.sparePartCategory.create({
      data: {
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        code,
        name,
        active: input.active ?? true,
      },
    });
    return classificationResult(
      category,
      "SparePartCategory",
      "CREATE_SPARE_PART_CATEGORY",
    );
  });
}

export async function updateSparePartCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: ClassificationUpdateInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const name = requiredText(input.name, "Spare part category name");
  const code = normalizeMasterCode(input.code, "Spare part category code");
  return runStoreMutation(actor.id, scope, async (tx) => {
    await tx.sparePartCategory.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
    });
    await assertUniqueSparePartCategory(tx, scope.plantId, { code, name }, id);
    const updated = await tx.sparePartCategory.update({
      where: { id },
      data: { code, name, active: input.active },
    });
    return classificationResult(
      updated,
      "SparePartCategory",
      "UPDATE_SPARE_PART_CATEGORY",
      {
        active: input.active,
      },
    );
  });
}

export async function deleteSparePartCategory(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  await runStoreMutation(actor.id, scope, async (tx) => {
    const category = await tx.sparePartCategory.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
      include: { _count: { select: { spareParts: true } } },
    });
    if (category._count.spareParts) {
      throw new Error(
        "This spare part category is already in use. Set it to inactive instead.",
      );
    }
    await tx.sparePartCategory.delete({ where: { id } });
    return deletionResult(
      id,
      category,
      "SparePartCategory",
      "DELETE_SPARE_PART_CATEGORY",
    );
  });
}

export async function createSparePartType(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: ClassificationInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const code = normalizeMasterCode(input.code, "Spare part type code");
  const name = requiredText(input.name, "Spare part type name");
  return runStoreMutation(actor.id, scope, async (tx) => {
    await assertUniqueSparePartType(tx, scope.plantId, { code, name });
    const created = await tx.sparePartType.create({
      data: {
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        code,
        name,
        active: input.active ?? true,
      },
    });
    return classificationResult(
      created,
      "SparePartType",
      "CREATE_SPARE_PART_TYPE",
    );
  });
}

export async function updateSparePartType(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: ClassificationUpdateInput,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const code = normalizeMasterCode(input.code, "Spare part type code");
  const name = requiredText(input.name, "Spare part type name");
  return runStoreMutation(actor.id, scope, async (tx) => {
    await tx.sparePartType.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
    });
    await assertUniqueSparePartType(tx, scope.plantId, { code, name }, id);
    const updated = await tx.sparePartType.update({
      where: { id },
      data: { code, name, active: input.active },
    });
    return classificationResult(
      updated,
      "SparePartType",
      "UPDATE_SPARE_PART_TYPE",
      {
        active: input.active,
      },
    );
  });
}

export async function deleteSparePartType(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  await runStoreMutation(actor.id, scope, async (tx) => {
    const type = await tx.sparePartType.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
      include: { _count: { select: { spareParts: true } } },
    });
    if (type._count.spareParts) {
      throw new Error(
        "This spare part type is already in use. Set it to inactive instead.",
      );
    }
    await tx.sparePartType.delete({ where: { id } });
    return deletionResult(id, type, "SparePartType", "DELETE_SPARE_PART_TYPE");
  });
}

export async function createSparePartMaterialGroup(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  input: { categoryId: string; code: string; name: string; active?: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const categoryId = requiredText(input.categoryId, "Spare part category");
  const code = normalizeMasterCode(
    input.code,
    "Spare part material group code",
  );
  const name = requiredText(input.name, "Spare part material group name");
  return runStoreMutation(actor.id, scope, async (tx) => {
    await tx.sparePartCategory.findFirstOrThrow({
      where: { id: categoryId, plantId: scope.plantId, active: true },
    });
    await assertUniqueSparePartMaterialGroup(tx, categoryId, { code, name });
    const created = await tx.sparePartMaterialGroup.create({
      data: {
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        categoryId,
        code,
        name,
        active: input.active ?? true,
      },
    });
    return classificationResult(
      created,
      "SparePartMaterialGroup",
      "CREATE_SPARE_PART_MATERIAL_GROUP",
      {
        categoryId,
      },
    );
  });
}

export async function updateSparePartMaterialGroup(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
  input: { categoryId: string; code: string; name: string; active: boolean },
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  const categoryId = requiredText(input.categoryId, "Spare part category");
  const code = normalizeMasterCode(
    input.code,
    "Spare part material group code",
  );
  const name = requiredText(input.name, "Spare part material group name");
  return runStoreMutation(actor.id, scope, async (tx) => {
    await tx.sparePartMaterialGroup.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
    });
    await tx.sparePartCategory.findFirstOrThrow({
      where: { id: categoryId, plantId: scope.plantId, active: true },
    });
    await assertUniqueSparePartMaterialGroup(
      tx,
      categoryId,
      { code, name },
      id,
    );
    const updated = await tx.sparePartMaterialGroup.update({
      where: { id },
      data: { categoryId, code, name, active: input.active },
    });
    return classificationResult(
      updated,
      "SparePartMaterialGroup",
      "UPDATE_SPARE_PART_MATERIAL_GROUP",
      {
        categoryId,
        active: input.active,
      },
    );
  });
}

export async function deleteSparePartMaterialGroup(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  id: string,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  await runStoreMutation(actor.id, scope, async (tx) => {
    const group = await tx.sparePartMaterialGroup.findFirstOrThrow({
      where: { id, plantId: scope.plantId },
      include: { _count: { select: { spareParts: true } } },
    });
    if (group._count.spareParts) {
      throw new Error(
        "This spare part material group is already in use. Set it to inactive instead.",
      );
    }
    await tx.sparePartMaterialGroup.delete({ where: { id } });
    return deletionResult(
      id,
      group,
      "SparePartMaterialGroup",
      "DELETE_SPARE_PART_MATERIAL_GROUP",
    );
  });
}

function classificationResult<
  T extends { id: string; code: string | null; name: string },
>(
  value: T,
  entityType: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  return {
    value,
    audit: {
      entityType,
      entityId: value.id,
      action,
      after: { ...extra, code: value.code, name: value.name },
    },
  };
}

function deletionResult(
  id: string,
  value: { code: string | null; name: string },
  entityType: string,
  action: string,
) {
  return {
    value: undefined,
    audit: {
      entityType,
      entityId: id,
      action,
      after: { code: value.code, name: value.name },
    },
  };
}

async function assertUniqueSparePartCategory(
  tx: Prisma.TransactionClient,
  plantId: string,
  input: { code: string; name: string },
  excludeId?: string,
) {
  const duplicate = await tx.sparePartCategory.findFirst({
    where: {
      plantId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ code: input.code }, { name: input.name }],
    },
    select: { id: true },
  });
  if (duplicate)
    throw new Error(
      "Spare part category code or name already exists in this Site.",
    );
}

async function assertUniqueSparePartType(
  tx: Prisma.TransactionClient,
  plantId: string,
  input: { code: string; name: string },
  excludeId?: string,
) {
  const duplicate = await tx.sparePartType.findFirst({
    where: {
      plantId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ code: input.code }, { name: input.name }],
    },
    select: { id: true },
  });
  if (duplicate)
    throw new Error(
      "Spare part type code or name already exists in this Site.",
    );
}

async function assertUniqueSparePartMaterialGroup(
  tx: Prisma.TransactionClient,
  categoryId: string,
  input: { code: string; name: string },
  excludeId?: string,
) {
  const duplicate = await tx.sparePartMaterialGroup.findFirst({
    where: {
      categoryId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ code: input.code }, { name: input.name }],
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error(
      "Material group code or name already exists in this spare part category.",
    );
  }
}
