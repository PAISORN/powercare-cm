import type { StoreScope } from "./store-types";
import { formatSparePartCode } from "./store-numbering";

export type CreateSparePartInput = {
  name: string;
  unit: string;
  itemCode: string;
  description?: string | null;
  categoryId: string;
  typeId: string;
  defaultStoreId: string;
  storageZoneId: string;
  minStock: number;
  maxStock?: number | null;
  reorderPoint: number;
  latestUnitPrice?: number | null;
  active?: boolean;
  zoneIds?: string[];
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
    description: string | null;
    categoryId: string;
    typeId: string;
    defaultStoreId: string;
    storageZoneId: string;
    minStock: number;
    maxStock: number | null;
    reorderPoint: number;
    latestUnitPrice: number | null;
    active: boolean;
    zoneIds: string[];
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
  const name = input.name.trim();
  const unit = input.unit.trim();
  const itemCode = requiredCode(input.itemCode, "Item Code");
  const categoryId = requiredText(input.categoryId, "Spare part category");
  const typeId = requiredText(input.typeId, "Spare part type");
  const defaultStoreId = requiredText(input.defaultStoreId, "Spare part store");
  const storageZoneId = requiredText(input.storageZoneId, "Storage Zone");
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
    name,
    unit,
    itemCode,
    description: optionalText(input.description),
    categoryId,
    typeId,
    defaultStoreId,
    storageZoneId,
    minStock: input.minStock,
    maxStock: input.maxStock ?? null,
    reorderPoint: input.reorderPoint,
    latestUnitPrice: input.latestUnitPrice ?? null,
    active: input.active ?? true,
    zoneIds: [...new Set((input.zoneIds ?? []).map((value) => value.trim()).filter(Boolean))],
  };
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
