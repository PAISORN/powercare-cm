import type { Prisma } from "@prisma/client";

export type AssetListQuery = {
  organizationId?: string;
  plantId?: string;
  search?: string;
  assetClassId?: string;
  familyId?: string;
  zoneId?: string;
  status?: string;
  criticality?: string;
  systemId?: string;
  assetTypeId?: string;
  assetLevel?: string;
  discipline?: string;
  sort?: string;
  view?: string;
};

export function assetListWhere(
  plantId: string,
  query: AssetListQuery,
): Prisma.AssetWhereInput {
  return {
    plantId,
    registrationStatus: "ACTIVE",
    ...(query.systemId ? { systemId: query.systemId } : {}),
    ...(query.assetTypeId ? { assetTypeId: query.assetTypeId } : {}),
    ...(query.assetLevel ? { assetLevel: query.assetLevel } : {}),
    ...(query.discipline ? { discipline: query.discipline } : {}),
    ...(query.assetClassId ? { assetClassId: query.assetClassId } : {}),
    ...(query.familyId ? { familyId: query.familyId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.status ? { operatingStatus: query.status } : {}),
    ...(query.criticality ? { criticality: query.criticality } : {}),
    ...(query.search
      ? {
          OR: [
            { code: { contains: query.search } },
            { nameTh: { contains: query.search } },
            { nameEn: { contains: query.search } },
            { tagKks: { contains: query.search } },
            { serialNumber: { contains: query.search } },
            { manufacturer: { contains: query.search } },
            { model: { contains: query.search } },
          ],
        }
      : {}),
  };
}

export function assetListOrderBy(
  query: AssetListQuery,
): Prisma.AssetOrderByWithRelationInput[] {
  return query.sort === "name"
    ? [{ nameTh: "asc" }, { code: "asc" }]
    : [{ code: query.sort === "codeDesc" ? "desc" : "asc" }];
}

export function isAssetHierarchyView(query: AssetListQuery) {
  return query.view !== "list";
}

export function assetsUrl(query: AssetListQuery) {
  const params = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  return `/assets?${params}`;
}

export function assetViewUrl(query: AssetListQuery, view: "list" | "tree") {
  return assetsUrl({ ...query, view });
}
