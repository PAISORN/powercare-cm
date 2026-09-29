import { describe, expect, it } from "vitest";
import { inventoryItemInputFromFormData } from "./inventory-item-edit";

describe("inventory item edit form", () => {
  it("maps the shared Inventory Item fields for every edit adapter", () => {
    const formData = new FormData();
    formData.set("itemKind", "CHEMICAL");
    formData.set("name", "Cleaning agent");
    formData.set("itemCode", "chem-001");
    formData.set("description", "For maintenance");
    formData.set("unit", "L");
    formData.set("categoryId", "category");
    formData.set("materialGroupId", "group");
    formData.set("typeId", "type");
    formData.set("defaultStoreId", "store");
    formData.set("minStock", "2.5");
    formData.set("maxStock", "20");
    formData.set("reorderPoint", "5");
    formData.set("latestUnitPrice", "125.75");
    formData.set("active", "on");

    expect(inventoryItemInputFromFormData(formData)).toEqual({
      itemKind: "CHEMICAL",
      name: "Cleaning agent",
      itemCode: "chem-001",
      description: "For maintenance",
      unit: "L",
      categoryId: "category",
      materialGroupId: "group",
      typeId: "type",
      defaultStoreId: "store",
      minStock: 2.5,
      maxStock: 20,
      reorderPoint: 5,
      latestUnitPrice: 125.75,
      active: true,
    });
  });

  it("keeps optional numeric fields null when disabled or blank", () => {
    const formData = new FormData();
    formData.set("name", "Seal");
    formData.set("itemCode", "SEAL-1");
    formData.set("unit", "PCS");
    formData.set("categoryId", "category");
    formData.set("materialGroupId", "group");
    formData.set("typeId", "type");
    formData.set("defaultStoreId", "store");
    formData.set("minStock", "0");
    formData.set("reorderPoint", "0");
    formData.set("maxStock", " ");

    expect(inventoryItemInputFromFormData(formData)).toMatchObject({
      itemKind: "SPARE_PART",
      maxStock: null,
      latestUnitPrice: null,
      active: false,
    });
  });
});
