import { PrismaClient } from "@prisma/client";
import { isAllowedAssetCode } from "../modules/assets/asset-service";

const db = new PrismaClient();

async function main() {
  const plant = await db.plant.findFirstOrThrow({ where: { code: "RTB", active: true } });
  const [assets, systems, types, pmWorks, pmMemberships, linkedCmWorks, zones] = await Promise.all([
    db.asset.findMany({ where: { plantId: plant.id }, select: { id: true, code: true, parentId: true, assetLevel: true, migrationStatus: true, system: { select: { nameTh: true } }, assetType: { select: { nameEn: true, nameTh: true } } } }),
    db.assetSystem.count({ where: { plantId: plant.id } }),
    db.assetType.count({ where: { plantId: plant.id } }),
    db.pmWork.count({ where: { plantId: plant.id } }),
    db.pmGroupAsset.count({ where: { plantId: plant.id } }),
    db.cmWork.count({ where: { asset: { plantId: plant.id } } }),
    db.zone.findMany({ where: { plantId: plant.id, name: { in: ["ASH Handling", "Water Treatment"] } }, select: { name: true, active: true } }),
  ]);
  const ids = new Set(assets.map(asset => asset.id));
  const duplicateCodes = assets.length - new Set(assets.map(asset => asset.code)).size;
  const invalidCodes = assets.filter(asset => !asset.code || !isAllowedAssetCode(asset.code, asset.system?.nameTh));
  const orphanParents = assets.filter(asset => asset.parentId && !ids.has(asset.parentId));
  const countType = (name: string) => assets.filter(asset => (asset.assetType?.nameEn || asset.assetType?.nameTh) === name).length;
  const counts = (field: "assetLevel" | "migrationStatus") => Object.fromEntries([...new Set(assets.map(asset => asset[field]))].sort().map(value => [value, assets.filter(asset => asset[field] === value).length]));
  const report = {
    plant: plant.code,
    assets: assets.length,
    uniqueCodes: new Set(assets.map(asset => asset.code)).size,
    invalidCodes: invalidCodes.length,
    duplicateCodes,
    orphanParents: orphanParents.length,
    systems,
    types,
    levels: counts("assetLevel"),
    migrationStatus: counts("migrationStatus"),
    controlValve: countType("Control Valve"),
    linkedCmWorks,
    pmDependencies: { pmWorks, pmMemberships },
    zones,
  };
  console.log(JSON.stringify(report, null, 2));
  if (assets.length !== 583 || duplicateCodes || invalidCodes.length || orphanParents.length || systems !== 13 || types !== 21 || countType("Control Valve") !== 20 || linkedCmWorks !== 28 || pmWorks || pmMemberships || zones.length !== 2 || zones.some(zone => !zone.active)) {
    throw new Error("Asset replacement verification failed");
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
