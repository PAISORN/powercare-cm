"use server";

import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { updateInventoryItemFromFormData } from "../../../modules/store/inventory-item-edit";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import {
  createSparePart,
  createSparePartCategory,
  createSparePartMaterialGroup,
  createSparePartType,
  createStore,
  deleteSparePartCategory,
  deleteSparePartMaterialGroup,
  deleteSparePartType,
  deleteStore,
  updateSparePartCategory,
  updateSparePartMaterialGroup,
  updateSparePartType,
  updateStore,
  updateStoreApplicableZones,
  updateStoreSiteCode,
} from "../../../modules/store/store-prisma-service";

export async function addSparePartCategory(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  await createSparePartCategory(user, await toStoreScope(scope), {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
  });
  redirect(pageUrl(scope, "part-category"));
}

export async function saveSparePartCategory(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") === "delete") {
    await deleteSparePartCategory(user, storeScope, id);
  } else {
    await updateSparePartCategory(user, storeScope, id, {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      active: formData.get("active") === "on",
    });
  }
  redirect(pageUrl(scope, "part-category-updated"));
}

export async function addSparePartType(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  await createSparePartType(user, await toStoreScope(scope), {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
  });
  redirect(pageUrl(scope, "part-type"));
}

export async function saveSparePartType(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") === "delete") {
    await deleteSparePartType(user, storeScope, id);
  } else {
    await updateSparePartType(user, storeScope, id, {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      active: formData.get("active") === "on",
    });
  }
  redirect(pageUrl(scope, "part-type-updated"));
}

export async function addSparePartMaterialGroup(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  try {
    await createSparePartMaterialGroup(user, await toStoreScope(scope), {
      categoryId: String(formData.get("categoryId") ?? ""),
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
    });
  } catch (error) {
    redirect(pageErrorUrl(scope, materialGroupActionError(error)));
  }
  redirect(pageUrl(scope, "material-group"));
}

export async function saveSparePartMaterialGroup(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  try {
    if (formData.get("intent") === "delete") {
      await deleteSparePartMaterialGroup(user, storeScope, id);
    } else {
      await updateSparePartMaterialGroup(user, storeScope, id, {
        categoryId: String(formData.get("categoryId") ?? ""),
        code: String(formData.get("code") ?? ""),
        name: String(formData.get("name") ?? ""),
        active: formData.get("active") === "on",
      });
    }
  } catch (error) {
    redirect(pageErrorUrl(scope, materialGroupActionError(error)));
  }
  redirect(pageUrl(scope, "material-group-updated"));
}

export async function saveStore(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") === "delete") {
    await deleteStore(user, storeScope, id);
  } else {
    await updateStore(user, storeScope, id, {
      name: String(formData.get("name") ?? ""),
      code: String(formData.get("code") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      location: String(formData.get("location") ?? ""),
      active: formData.get("active") === "on",
    });
  }
  redirect(pageUrl(scope, "store-updated"));
}

export async function addStore(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  await createStore(user, await toStoreScope(scope), {
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    location: String(formData.get("location") ?? ""),
  });
  redirect(pageUrl(scope, "store"));
}

export async function addSparePart(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  await createSparePart(user, await toStoreScope(scope), {
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
  });
  redirect(pageUrl(scope, "spare-part"));
}

export async function updateSparePartAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  await updateInventoryItemFromFormData(
    user,
    await toStoreScope(scope),
    String(formData.get("sparePartId") ?? ""),
    formData,
  );
  redirect(pageUrl(scope, "spare-part-updated"));
}

export async function configureStoreCode(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  await updateStoreSiteCode(
    user,
    { organizationId: scope.organization.id, plantId: scope.plant.id },
    String(formData.get("inventoryCode") ?? ""),
  );
  redirect(pageUrl(scope, "store-code"));
}

export async function saveStoreApplicableZones(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const assignments = formData.getAll("zoneIds").map((value) => {
    const zoneId = String(value);
    return {
      zoneId,
      code: String(formData.get(`zoneCode:${zoneId}`) ?? ""),
      active: formData.get(`zoneActive:${zoneId}`) === "on",
    };
  });
  try {
    await updateStoreApplicableZones(
      user,
      await toStoreScope(scope),
      assignments,
    );
  } catch (error) {
    redirect(pageErrorUrl(scope, applicableZoneActionError(error)));
  }
  redirect(pageUrl(scope, "applicable-zones"));
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

async function toStoreScope(scope: {
  organization: { id: string };
  plant: { id: string };
}) {
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode) {
    throw new Error(
      "Store Site code must be configured before using Store Inventory.",
    );
  }
  return {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: plant.inventoryCode,
  };
}

function pageUrl(
  scope: { organization: { id: string }; plant: { id: string } },
  saved: string,
) {
  return `/dashboardstore/spare-parts?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&saved=${saved}`;
}

function pageErrorUrl(
  scope: { organization: { id: string }; plant: { id: string } },
  error: string,
) {
  return `/dashboardstore/spare-parts?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&error=${encodeURIComponent(error)}`;
}

function materialGroupActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("may contain letters, numbers")) {
    return "รหัสอะไหล่/วัสดุต้องขึ้นต้นด้วยภาษาอังกฤษหรือตัวเลข และใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข จุด ขีดล่าง เครื่องหมาย / หรือ - เช่น PIPE-01";
  }
  if (message.includes("is required")) {
    return "กรุณากรอกหมวดหมู่ รหัส และชื่อกลุ่มอะไหล่/วัสดุให้ครบถ้วน";
  }
  if (message.includes("already")) {
    return "รหัสหรือชื่อกลุ่มอะไหล่/วัสดุนี้มีอยู่แล้วในหมวดหมู่ที่เลือก";
  }
  return "บันทึกกลุ่มอะไหล่/วัสดุไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง";
}

function applicableZoneActionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("must not be duplicated")) {
    return "รหัส Applicable Zone ต้องไม่ซ้ำกันภายใน Site เดียวกัน";
  }
  if (message.includes("must belong to the selected Site")) {
    return "พบ Zone ที่ไม่อยู่ใน Site ปัจจุบัน กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง";
  }
  return "บันทึก Applicable Zones ไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง";
}
