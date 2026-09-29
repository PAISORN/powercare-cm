import { db } from "../../lib/db";

export async function loadAssetRegistrationOptions(plantId: string) {
  const [families, classes, types, zones, systems, parents] = await Promise.all(
    [
      db.assetFamily.findMany({
        where: { plantId, active: true },
        orderBy: { code: "asc" },
      }),
      db.assetClass.findMany({
        where: { plantId, active: true },
        orderBy: { nameTh: "asc" },
      }),
      db.assetType.findMany({
        where: { plantId, active: true },
        include: {
          fields: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        },
        orderBy: { code: "asc" },
      }),
      db.zone.findMany({
        where: { plantId, active: true },
        orderBy: { name: "asc" },
      }),
      db.assetSystem.findMany({
        where: { plantId, active: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      }),
      db.asset.findMany({
        where: { plantId, registrationStatus: "ACTIVE" },
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          nameTh: true,
          nameEn: true,
          parentId: true,
          systemId: true,
          assetLevel: true,
          plantId: true,
          migrationStatus: true,
        },
      }),
    ],
  );

  return { families, classes, types, zones, systems, parents };
}

export type AssetRegistrationOptions = Awaited<
  ReturnType<typeof loadAssetRegistrationOptions>
>;
