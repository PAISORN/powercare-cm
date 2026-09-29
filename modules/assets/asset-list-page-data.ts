import { db } from "../../lib/db";
import {
  assetListOrderBy,
  assetListWhere,
  isAssetHierarchyView,
  type AssetListQuery,
} from "./asset-list-query";

const assetListInclude = {
  family: true,
  assetType: true,
  zone: true,
  system: true,
  cmWorks: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { status: true, closedAt: true },
  },
  pmWorks: {
    orderBy: { updatedAt: "desc" as const },
    take: 1,
    select: { status: true },
  },
};

export async function loadAssetListPageData(
  plantId: string,
  query: AssetListQuery,
) {
  const where = assetListWhere(plantId, query);
  const orderBy = assetListOrderBy(query);
  const activeAssetsWhere = { plantId, registrationStatus: "ACTIVE" };

  const [
    filteredTotal,
    assets,
    assetClasses,
    families,
    zones,
    total,
    underRepair,
    critical,
    systems,
    types,
    treeAssets,
  ] = await Promise.all([
    db.asset.count({ where }),
    db.asset.findMany({ where, include: assetListInclude, orderBy }),
    db.assetClass.findMany({
      where: { plantId, active: true },
      orderBy: [{ nameTh: "asc" }, { nameEn: "asc" }],
    }),
    db.assetFamily.findMany({
      where: { plantId, active: true },
      orderBy: { code: "asc" },
    }),
    db.zone.findMany({
      where: { plantId, active: true },
      orderBy: { name: "asc" },
    }),
    db.asset.count({ where: activeAssetsWhere }),
    db.asset.count({
      where: { ...activeAssetsWhere, operatingStatus: "UNDER_REPAIR" },
    }),
    db.asset.count({
      where: { ...activeAssetsWhere, criticality: "CRITICAL" },
    }),
    db.assetSystem.findMany({
      where: { plantId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
    db.assetType.findMany({
      where: { plantId, active: true },
      orderBy: { nameTh: "asc" },
    }),
    isAssetHierarchyView(query)
      ? db.asset.findMany({
          where: activeAssetsWhere,
          include: assetListInclude,
          orderBy,
        })
      : Promise.resolve([]),
  ]);

  return {
    filteredTotal,
    assets,
    assetClasses,
    families,
    zones,
    total,
    underRepair,
    critical,
    systems,
    types,
    treeAssets,
  };
}

export type AssetListPageData = Awaited<
  ReturnType<typeof loadAssetListPageData>
>;
