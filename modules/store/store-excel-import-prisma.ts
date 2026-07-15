import { randomUUID } from "node:crypto";
import { db } from "../../lib/db";
import { PermissionKey, type PermissionUserContext } from "../auth/site-admin-permissions";
import { formatSparePartCode } from "./store-numbering";
import {
  parseSparePartImportWorkbook,
  validateSparePartImportRows,
} from "./spare-part-excel-import";
import { assertActorStoreScope, requireStorePermission } from "./store-prisma-service";
import { StockMovementType, type StoreScope } from "./store-types";

const maxFileSizeBytes = 5 * 1024 * 1024;

export async function importSparePartsFromExcel(
  actor: PermissionUserContext & { id: string },
  scope: StoreScope,
  file: File,
) {
  requireStorePermission(actor, PermissionKey.MANAGE_SPARE_PARTS);
  assertActorStoreScope(actor, scope);
  validateFile(file);

  const parsedRows = parseSparePartImportWorkbook(await file.arrayBuffer());
  const [stores, types, categories, existingItemCodes] = await Promise.all([
    db.store.findMany({
      where: { plantId: scope.plantId, active: true },
      select: { id: true, code: true },
    }),
    db.sparePartType.findMany({
      where: { plantId: scope.plantId, active: true },
      select: { id: true, code: true },
    }),
    db.sparePartCategory.findMany({
      where: { plantId: scope.plantId, active: true },
      select: { id: true, code: true },
    }),
    db.sparePart.findMany({
      where: { organizationId: scope.organizationId, itemCode: { not: null } },
      select: { itemCode: true },
    }),
  ]);
  const rows = validateSparePartImportRows(parsedRows, {
    stores,
    types,
    categories,
    existingItemCodes: existingItemCodes.flatMap((row) => (row.itemCode ? [row.itemCode] : [])),
  });
  const batchId = randomUUID();

  await db.$transaction(async (tx) => {
    await tx.plant.findFirstOrThrow({
      where: { id: scope.plantId, organizationId: scope.organizationId, active: true },
    });
    const sequence = await tx.sparePartSequence.upsert({
      where: { plantId: scope.plantId },
      update: { lastNumber: { increment: rows.length } },
      create: { plantId: scope.plantId, lastNumber: rows.length },
      select: { lastNumber: true },
    });
    const firstNumber = sequence.lastNumber - rows.length + 1;

    for (const [index, row] of rows.entries()) {
      const sparePart = await tx.sparePart.create({
        data: {
          organizationId: scope.organizationId,
          plantId: scope.plantId,
          code: formatSparePartCode(scope.plantCode, firstNumber + index),
          itemCode: row.itemCode,
          name: row.name,
          description: row.description,
          unit: row.unit,
          categoryId: row.categoryId,
          typeId: row.typeId,
          defaultStoreId: row.storeId,
          minStock: row.minStock,
          maxStock: row.maxStock,
          reorderPoint: row.reorderPoint,
          latestUnitPrice: row.latestUnitPrice,
          active: row.active,
        },
        select: { id: true },
      });
      await tx.storeStock.create({
        data: {
          organizationId: scope.organizationId,
          plantId: scope.plantId,
          storeId: row.storeId,
          sparePartId: sparePart.id,
          quantity: row.openingQuantity,
        },
      });
      if (row.openingQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            organizationId: scope.organizationId,
            plantId: scope.plantId,
            storeId: row.storeId,
            sparePartId: sparePart.id,
            actorId: actor.id,
            movementType: StockMovementType.ADJUSTMENT,
            refType: "SPARE_PART_EXCEL_IMPORT",
            refId: batchId,
            quantityChange: row.openingQuantity,
            balanceAfter: row.openingQuantity,
            unitPrice: row.latestUnitPrice,
            note: `Opening balance imported from ${file.name}`,
          },
        });
      }
    }

    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        entityType: "SparePartImport",
        entityId: batchId,
        action: "IMPORT_SPARE_PARTS_EXCEL",
        afterJson: JSON.stringify({ fileName: file.name, itemCount: rows.length }),
      },
    });
  });

  return { importedCount: rows.length, batchId };
}

function validateFile(file: File) {
  if (!file || file.size === 0) throw new Error("กรุณาเลือกไฟล์ Excel");
  if (file.size > maxFileSizeBytes) throw new Error("ไฟล์ Excel ต้องมีขนาดไม่เกิน 5 MB");
  if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error("รองรับเฉพาะไฟล์ .xlsx หรือ .xls");
}
