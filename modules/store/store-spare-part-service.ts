import type { StoreScope } from "./store-types";
import { formatSparePartCode } from "./store-numbering";

export type CreateSparePartInput = {
  itemKind?: string;
  name: string;
  unit: string;
  itemCode: string;
  description?: string | null;
  categoryId: string;
  materialGroupId: string;
  typeId: string;
  defaultStoreId: string;
  minStock: number;
  maxStock?: number | null;
  reorderPoint: number;
  latestUnitPrice?: number | null;
  active?: boolean;
};

export type SparePartRepository = {
  reserveNextNumber(plantId: string): Promise<number>;
  createSparePart(input: {
    organizationId: string;
    plantId: string;
    code: string;
    name: string;
    unit: string;
    itemCode: string;
    itemKind: string;
    description: string | null;
    categoryId: string;
    materialGroupId: string;
    typeId: string;
    defaultStoreId: string;
    minStock: number;
    maxStock: number | null;
    reorderPoint: number;
    latestUnitPrice: number | null;
    active: boolean;
  }): Promise<{ id: string; code: string }>;
};

export async function createSparePartWithRepository(
  repository: SparePartRepository,
  scope: StoreScope,
  input: CreateSparePartInput,
) {
  const normalized = normalizeSparePartInput(input);
  const nextNumber = await repository.reserveNextNumber(scope.plantId);

  return repository.createSparePart({
    organizationId: scope.organizationId,
    plantId: scope.plantId,
    code: formatSparePartCode(scope.plantCode, nextNumber),
    ...normalized,
  });
}

export function normalizeSparePartInput(input: CreateSparePartInput) {
  const itemKind = normalizeInventoryItemKind(input.itemKind ?? "SPARE_PART");
  const name = input.name.trim();
  const unit = input.unit.trim();
  const itemCode = requiredCode(input.itemCode, "Item Code");
  const categoryId = requiredText(input.categoryId, "Spare part category");
  const materialGroupId = requiredText(input.materialGroupId, "Spare part material group");
  const typeId = requiredText(input.typeId, "Spare part type");
  const defaultStoreId = requiredText(input.defaultStoreId, "Spare part store");
  if (!name) throw new Error("Spare part name is required.");
  if (!unit) throw new Error("Unit is required.");
  if (!Number.isFinite(input.minStock) || input.minStock < 0) {
    throw new Error("Minimum stock must not be negative.");
  }
  if (input.maxStock != null && (!Number.isFinite(input.maxStock) || input.maxStock < 0)) {
    throw new Error("Maximum stock must not be negative.");
  }
  if (input.maxStock != null && input.maxStock < input.minStock) {
    throw new Error("Maximum stock must be greater than or equal to minimum stock.");
  }
  if (!Number.isFinite(input.reorderPoint) || input.reorderPoint < 0) {
    throw new Error("Reorder point must not be negative.");
  }
  if (input.maxStock != null && input.reorderPoint > input.maxStock) {
    throw new Error("Reorder point must not exceed maximum stock.");
  }
  if (
    input.latestUnitPrice != null &&
    (!Number.isFinite(input.latestUnitPrice) || input.latestUnitPrice < 0)
  ) {
    throw new Error("Latest unit price must not be negative.");
  }

  return {
    itemKind,
    name,
    unit,
    itemCode,
    description: optionalText(input.description),
    categoryId,
    materialGroupId,
    typeId,
    defaultStoreId,
    minStock: input.minStock,
    maxStock: input.maxStock ?? null,
    reorderPoint: input.reorderPoint,
    latestUnitPrice: input.latestUnitPrice ?? null,
    active: input.active ?? true,
  };
}

function normalizeInventoryItemKind(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!["SPARE_PART", "CHEMICAL", "OIL"].includes(normalized)) {
    throw new Error("Inventory item kind is invalid.");
  }
  return normalized;
}

function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function requiredCode(value: string, label: string) {
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
