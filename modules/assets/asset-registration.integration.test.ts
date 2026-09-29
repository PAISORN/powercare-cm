import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

let integrationDb: PrismaClient;
vi.mock("../../lib/db", () => ({ get db() { return integrationDb; } }));

describe("Asset registration transaction", () => {
  const fixture = `asset-registration-${Date.now()}`;
  const tempDirectory = mkdtempSync(join(tmpdir(), "asset-registration-"));
  const databasePath = join(tempDirectory, "rollback.db");
  const ids = {
    organizationId: `${fixture}-org`,
    plantId: `${fixture}-site`,
    userId: `${fixture}-user`,
    classId: `${fixture}-class`,
    typeId: `${fixture}-type`,
    systemId: `${fixture}-system`,
    fieldId: `${fixture}-field`,
  };
  const options = {
    actorId: ids.userId,
    organizationId: ids.organizationId,
    technicalValues: { [ids.fieldId]: "1450" },
  };
  const input = {
    plantId: ids.plantId,
    systemId: ids.systemId,
    assetTypeId: ids.typeId,
    assetLevel: "MAIN_ASSET",
    nameTh: "Boiler Feed Pump",
    operatingStatus: "IN_SERVICE",
    criticality: "HIGH",
  };

  beforeAll(async () => {
    copyFileSync(resolve("prisma/dev.db"), databasePath);
    integrationDb = new PrismaClient({ datasources: { db: { url: `file:${databasePath.replaceAll("\\", "/")}` } } });
    await integrationDb.organization.create({ data: { id: ids.organizationId, slug: `${fixture}-slug`, name: "Asset Registration Organization" } });
    await integrationDb.plant.create({ data: { id: ids.plantId, organizationId: ids.organizationId, code: "ART", name: "Asset Registration Site" } });
    await integrationDb.user.create({ data: { id: ids.userId, username: `${fixture}-user`, passwordHash: "test-only", fullName: "Asset Registration Admin", role: RoleName.SITE_ADMIN, organizationId: ids.organizationId, plantId: ids.plantId } });
    await integrationDb.assetClass.create({ data: { id: ids.classId, plantId: ids.plantId, nameTh: "Pump Equipment" } });
    await integrationDb.assetType.create({ data: { id: ids.typeId, plantId: ids.plantId, assetClassId: ids.classId, code: "PMP", nameTh: "Pump" } });
    await integrationDb.assetSystem.create({ data: { id: ids.systemId, plantId: ids.plantId, code: "BLC", nameTh: "Boiler & Combustion" } });
    await integrationDb.assetTechnicalField.create({ data: { id: ids.fieldId, assetTypeId: ids.typeId, key: "speed", labelTh: "ความเร็วรอบ", dataType: "NUMBER", unit: "rpm", required: true } });
  });

  beforeEach(async () => {
    await integrationDb.$executeRawUnsafe('DROP TRIGGER IF EXISTS "fail-asset-audit"');
  });

  afterAll(async () => {
    await integrationDb?.$disconnect();
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  it("rolls back the Asset and code sequence when a required Technical Field is missing", async () => {
    const { createRegisteredAsset } = await import("./asset-service");

    await expect(createRegisteredAsset(input, { ...options, technicalValues: {} })).rejects.toThrow("กรุณาระบุ ความเร็วรอบ");

    expect(await integrationDb.asset.count({ where: { plantId: ids.plantId } })).toBe(0);
    expect(await integrationDb.assetCodeSequence.findUnique({ where: { plantId_typeCode: { plantId: ids.plantId, typeCode: "PMP" } } })).toBeNull();
    expect(await integrationDb.auditEvent.count({ where: { plantId: ids.plantId } })).toBe(0);
  });

  it("rolls back the Asset and Technical Value when Audit creation fails", async () => {
    await integrationDb.$executeRawUnsafe(`CREATE TRIGGER "fail-asset-audit" BEFORE INSERT ON "AuditEvent" WHEN NEW."entityType" = 'Asset' BEGIN SELECT RAISE(ABORT, 'injected asset audit failure'); END`);
    const { createRegisteredAsset } = await import("./asset-service");

    await expect(createRegisteredAsset(input, options)).rejects.toThrow();

    expect(await integrationDb.asset.count({ where: { plantId: ids.plantId } })).toBe(0);
    expect(await integrationDb.assetTechnicalValue.count()).toBe(0);
    expect(await integrationDb.assetCodeSequence.findUnique({ where: { plantId_typeCode: { plantId: ids.plantId, typeCode: "PMP" } } })).toBeNull();
  });

  it("preserves the previous Asset and Technical Value when an update Audit fails", async () => {
    const { createRegisteredAsset, updateRegisteredAsset } = await import("./asset-service");
    const created = await createRegisteredAsset(input, options);
    await integrationDb.$executeRawUnsafe(`CREATE TRIGGER "fail-asset-audit" BEFORE INSERT ON "AuditEvent" WHEN NEW."action" = 'UPDATE_ASSET' BEGIN SELECT RAISE(ABORT, 'injected asset audit failure'); END`);

    await expect(updateRegisteredAsset(created.id, { ...input, code: created.code, nameTh: "Changed Pump" }, { ...options, technicalValues: { [ids.fieldId]: "3000" } })).rejects.toThrow();

    const stored = await integrationDb.asset.findUniqueOrThrow({ where: { id: created.id }, include: { technicalValues: true } });
    expect(stored.nameTh).toBe("Boiler Feed Pump");
    expect(stored.technicalValues).toHaveLength(1);
    expect(stored.technicalValues[0]?.value).toBe("1450");
    expect(await integrationDb.auditEvent.count({ where: { entityId: created.id } })).toBe(1);
  });
});
