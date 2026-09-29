"use server";

import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { updateInventoryItemFromFormData } from "../../../modules/store/inventory-item-edit";
import {
  safeStockReturnTo,
  stockHrefWithFeedback,
} from "../../../modules/store/stock-action-return";
import { adjustStock } from "../../../modules/store/store-adjustment-prisma";
import { importSparePartsFromExcel } from "../../../modules/store/store-excel-import-prisma";
import { createLoggedInStoreIssue } from "../../../modules/store/store-issue-prisma";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { deleteSparePart } from "../../../modules/store/store-prisma-service";
import { receiveStock } from "../../../modules/store/store-receive-prisma";
import { sparePartImportErrorMessage } from "../../../modules/store/spare-part-excel-import";

export async function updateSparePartFromStockAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode)
    throw new Error(
      "Store Site code must be configured before editing spare parts.",
    );

  await updateInventoryItemFromFormData(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode,
    },
    String(formData.get("sparePartId") ?? ""),
    formData,
  );

  redirectWithStockFeedback(
    stockReturnTo(scope, formData),
    "saved",
    "spare-part-updated",
  );
}

export async function importSparePartsExcelAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  const returnTo = stockReturnTo(scope, formData, false);

  if (!plant.inventoryCode) {
    redirectWithStockFeedback(
      `${returnTo}&importExcel=1`,
      "importError",
      "กรุณากำหนดรหัส Site สำหรับคลังอะไหล่ก่อนนำเข้า Excel",
    );
  }

  let importedCount = 0;
  let importError: string | null = null;
  try {
    const upload = formData.get("excelFile");
    if (!(upload instanceof File) || upload.size === 0) {
      throw new Error("กรุณาเลือกไฟล์ Excel ที่ต้องการนำเข้า");
    }
    const result = await importSparePartsFromExcel(
      user,
      {
        organizationId: scope.organization.id,
        plantId: scope.plant.id,
        plantCode: plant.inventoryCode,
      },
      upload,
    );
    importedCount = result.importedCount;
  } catch (error) {
    importError = sparePartImportErrorMessage(error);
  }

  if (importError) {
    redirectWithStockFeedback(
      `${returnTo}&importExcel=1`,
      "importError",
      importError,
    );
  }
  redirectWithStockFeedback(returnTo, "imported", String(importedCount));
}

export async function adjustStockAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const [storeId, sparePartId] = String(formData.get("stockKey") ?? "").split(
    ":",
  );
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode)
    throw new Error(
      "Store Site code must be configured before adjusting stock.",
    );

  let adjustmentError: string | null = null;
  try {
    await adjustStock(
      user,
      {
        organizationId: scope.organization.id,
        plantId: scope.plant.id,
        plantCode: plant.inventoryCode,
      },
      {
        storeId: storeId ?? "",
        sparePartId: sparePartId ?? "",
        quantityChange: Number(formData.get("quantityChange")),
        reason: String(formData.get("reason") ?? ""),
        occurredAt: new Date(),
      },
    );
  } catch (error) {
    adjustmentError = adjustmentErrorMessage(error);
  }

  redirectWithStockFeedback(
    stockReturnTo(scope, formData),
    adjustmentError ? "error" : "saved",
    adjustmentError ?? "1",
  );
}

export async function receiveOneStockAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const [storeId, sparePartId] = String(formData.get("stockKey") ?? "").split(
    ":",
  );
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode)
    throw new Error(
      "Store Site code must be configured before receiving stock.",
    );

  await receiveStock(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode,
    },
    {
      supplierName: optionalText(formData.get("supplierName")),
      referenceNo: optionalText(formData.get("referenceNo")),
      note: optionalText(formData.get("note")),
      receivedAt: new Date(),
      items: [
        {
          storeId: storeId ?? "",
          sparePartId: sparePartId ?? "",
          quantity: Number(formData.get("quantity")),
          unitPrice: optionalNumber(formData.get("unitPrice")),
        },
      ],
    },
  );

  redirectWithStockFeedback(
    stockReturnTo(scope, formData),
    "saved",
    "received",
  );
}

export async function createOneIssueAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const [storeId, sparePartId] = String(formData.get("stockKey") ?? "").split(
    ":",
  );
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });

  await createLoggedInStoreIssue(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode ?? "",
    },
    {
      issueType: "DIRECT",
      requesterName: user.fullName,
      note: optionalText(formData.get("note")),
      requestedAt: new Date(),
      submissionKey: optionalText(formData.get("submissionKey")),
      items: [
        {
          storeId: storeId ?? "",
          sparePartId: sparePartId ?? "",
          zoneId: String(formData.get("zoneId") ?? ""),
          requestedQty: Number(formData.get("quantity")),
        },
      ],
    },
  );

  redirectWithStockFeedback(
    stockReturnTo(scope, formData),
    "saved",
    "issue-created",
  );
}

export async function deleteSparePartFromStockAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  await deleteSparePart(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode ?? "",
    },
    String(formData.get("sparePartId") ?? ""),
  );

  redirectWithStockFeedback(
    stockReturnTo(scope, formData, false),
    "saved",
    "spare-part-deleted",
  );
}

type StockScope = {
  organization: { id: string };
  plant: { id: string };
};

function stockReturnTo(
  scope: StockScope,
  formData: FormData,
  keepHash = true,
) {
  return safeStockReturnTo(
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    },
    formData.get("returnTo"),
    keepHash,
  );
}

function redirectWithStockFeedback(
  returnTo: string,
  key: string,
  value: string,
): never {
  redirect(stockHrefWithFeedback(returnTo, key, value));
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : null;
}

function adjustmentErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "โปรดลองใหม่อีกครั้ง";
  if (
    error.message.includes("reason is required") ||
    error.message.includes("must not be zero") ||
    error.message.includes("must not be negative") ||
    error.message.includes("outside the selected Site")
  ) {
    return error.message;
  }
  return "ไม่สามารถปรับยอดได้ โปรดตรวจสอบข้อมูลและลองใหม่";
}
