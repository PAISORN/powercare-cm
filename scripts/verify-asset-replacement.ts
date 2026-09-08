import { PrismaClient } from "@prisma/client";
import { isAllowedAssetCode } from "../modules/assets/asset-service";

const db = new PrismaClient();

async function main() {
  const plant = await db.plant.findFirstOrThrow({ where: { code: "RTB", active: true } });
  const [assets, systems, types, sequences, pmWorks, pmMemberships, cmPmLinks] = await Promise.all([
    db.asset.findMany({ where: { plantId: plant.id }, select: { id: true, code: true, parentId: true, assetLevel: true, migrationStatus: true, assetType: { select: { nameEn: true, nameTh: true } } } }),
    db.assetSystem.count({ where: { plantId: plant.id } }),
    db.assetType.count({ where: { plantId: plant.id } }),
    db.assetCodeSequence.count({ where: { plantId: plant.id } }),
    db.pmWork.count({ where: { plantId: plant.id } }),
    db.pmGroupAsset.count({ where: { plantId: plant.id } }),
    db.cmWork.count({ where: { originatingPmWork: { plantId: plant.id } } }),
  ]);
  const ids = new Set(assets.map(asset => asset.id));
  const duplicateCodes = assets.length - new Set(assets.map(asset => asset.code)).size;
  const invalidCodes = assets.filter(asset => !asset.code || !isAllowedAssetCode(asset.code));
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
    sequences,
    levels: counts("assetLevel"),
    migrationStatus: counts("migrationStatus"),
    controlValve: countType("Control Valve"),
    pressureRegulatingValve: countType("Pressure Regulating Valve"),
    removedLegacyLinks: { pmWorks, pmMemberships, cmPmLinks },
  };
  console.log(JSON.stringify(report, null, 2));
  if (assets.length !== 880 || duplicateCodes || invalidCodes.length || orphanParents.length || systems !== 15 || types !== 64 || countType("Control Valve") !== 19 || countType("Pressure Regulating Valve") !== 3 || pmWorks || pmMemberships || cmPmLinks) {
    throw new Error("Asset replacement verification failed");
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());