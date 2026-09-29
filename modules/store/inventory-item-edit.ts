import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { updateSparePart } from "./inventory-item-prisma";
import type { StoreScope } from "./store-types";

export function inventoryItemInputFromFormData(formData: FormData) {
  return {
    itemKind: String(formData.get("itemKind") ?? "SPARE_PART"),
    name: String(formData.get("name") ?? ""),
    itemCode: String(formData.get("itemCode") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    materialGroupId: String(formData.get("materialGroupId") ?? ""),
    typeId: String(formData.get("typeId") ?? ""),
    defaultStoreId: String(formData.get("defaultStoreId") ?? ""),
    minStock: Number(formData.get("minStock") ?? 0),
    maxStock: optionalNumber(formData.get("maxStock")),
    reorderPoint: Number(formData.get("reorderPoint") ?? 0),
    latestUnitPrice: optionalNumber(formData.get("latestUnitPrice")),
    active: formData.get("active") === "on",
  };
}

export async function updateInventoryItemFromFormData(
  actor: PermissionUserContext & {
    id: string;
    inventoryScopes?: Array<{
      itemKind: string;
      responsibilityEnabled: boolean;
    }>;
  },
  scope: StoreScope,
  sparePartId: string,
  formData: FormData,
) {
  return updateSparePart(
    actor,
    scope,
    sparePartId,
    inventoryItemInputFromFormData(formData),
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}
