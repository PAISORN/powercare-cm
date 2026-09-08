import { PrismaClient } from "@prisma/client";
import { defaultAssetLevelForType, normalizeAssetTypeName, validateAssetHierarchy } from "../modules/assets/asset-hierarchy";

const db = new PrismaClient();

async function main() {
  const [assets, systems, cmLinks, pmLinks, documents, technicalValues] = await Promise.all([
    db.asset.findMany({ include: { assetType: true }, orderBy: [{ plantId: "asc" }, { code: "asc" }] }),
    db.assetSystem.findMany({ select: { id: true, plantId: true, code: true, nameTh: true } }),
    db.cmWork.count({ where: { assetId: { not: null } } }),
    db.pmWork.count(),
    db.assetDocument.count(),
    db.assetTechnicalValue.count(),
  ]);
  const nodes = assets.map(asset => ({
    id: asset.id, plantId: asset.plantId, systemId: asset.systemId, parentId: asset.parentId,
    assetLevel: asset.assetLevel, nameTh: asset.nameTh, nameEn: asset.nameEn,
    assetTypeName: asset.assetType?.nameEn || asset.assetType?.nameTh || null,
    discipline: asset.discipline, migrationStatus: asset.migrationStatus,
  }));
  const unresolved = assets.flatMap(asset => {
    const node = nodes.find(item => item.id === asset.id)!;
    const issues = validateAssetHierarchy(node, nodes);
    if (!asset.code) issues.push("ASSET_CODE_REQUIRED");
    if (!asset.assetTypeId) issues.push("ASSET_TYPE_REQUIRED");
    if (asset.systemId && !systems.some(system => system.id === asset.systemId && system.plantId === asset.plantId)) issues.push("SYSTEM_NOT_IN_SITE");
    return issues.length || asset.migrationStatus !== "READY" ? [{ id: asset.id, code: asset.code, name: asset.nameEn || asset.nameTh, migrationStatus: asset.migrationStatus, issues: [...new Set(issues)] }] : [];
  });
  const codeGroups = new Map<string, string[]>();
  for (const asset of assets) if (asset.code) codeGroups.set(asset.code, [...(codeGroups.get(asset.code) || []), asset.id]);
  const duplicateCodes = [...codeGroups.entries()].filter(([, ids]) => ids.length > 1).map(([code, ids]) => ({ code, ids }));
  const typeNormalization = [...new Set(assets.flatMap(asset => {
    const current = asset.assetType?.nameEn || asset.assetType?.nameTh;
    if (!current) return [];
    const normalized = normalizeAssetTypeName(current);
    return normalized === current ? [] : [{ current, normalized }];
  }).map(item => JSON.stringify(item)))].map(item => JSON.parse(item));
  const countType = (name: string) => assets.filter(asset => normalizeAssetTypeName(asset.assetType?.nameEn || asset.assetType?.nameTh || "").toLowerCase() === name.toLowerCase()).length;
  const levelSuggestions = assets.flatMap(asset => {
    const type = asset.assetType?.nameEn || asset.assetType?.nameTh;
    if (!type) return [];
    const suggested = defaultAssetLevelForType(type);
    return asset.assetLevel === suggested ? [] : [{ id: asset.id, code: asset.code, current: asset.assetLevel, suggested, assetType: type }];
  });
  const report = {
    mode: "DRY_RUN",
    safeToApply: unresolved.length === 0 && duplicateCodes.length === 0,
    counts: {
      before: { assets: assets.length, systems: systems.length, cmAssetLinks: cmLinks, pmAssetLinks: pmLinks, documents, technicalValues },
      projectedAfter: { assets: assets.length, systems: systems.length, cmAssetLinks: cmLinks, pmAssetLinks: pmLinks, documents, technicalValues },
    },
    integrity: { duplicateCodes, unresolvedCount: unresolved.length },
    confirmedTypeChecks: {
      controlValve: { expected: 19, actual: countType("Control Valve") },
      pressureRegulatingValve: { expected: 3, actual: countType("Pressure Regulating Valve") },
    },
    typeNormalization,
    levelSuggestions,
    unresolved,
    note: "Asset Codes are read from existing/source records exactly. This command never writes data or invents codes.",
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.safeToApply) process.exitCode = 2;
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => db.$disconnect());
