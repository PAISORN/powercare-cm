import { db } from "../lib/db";

async function main() {
  const plants = await db.plant.findMany({
    include: {
      assets: { include: { family: true }, orderBy: [{ sequence: "asc" }, { createdAt: "asc" }] },
    },
  });

  let assetCount = 0;
  let cmCount = 0;
  for (const plant of plants) {
    const siteCode = plant.id === "dev-site-rungtiva" ? "RTB" : normalize(plant.code);
    if (plant.code !== siteCode) await db.plant.update({ where: { id: plant.id }, data: { code: siteCode } });

    for (const asset of plant.assets) {
      if (!asset.sequence) continue;
      const sequence = String(asset.sequence).padStart(3, "0");
      const component = asset.componentCode ? `-${normalize(asset.componentCode)}` : "";
      const nextCode = `${siteCode}-${normalize(asset.family.code)}${component}-${sequence}`;
      if (asset.code === nextCode) continue;

      const result = await db.$transaction(async (tx) => {
        const updatedCm = await tx.cmWork.updateMany({
          where: { assetId: asset.id },
          data: { assetCodeSnapshot: nextCode },
        });
        await tx.asset.update({ where: { id: asset.id }, data: { code: nextCode } });
        return updatedCm.count;
      });
      assetCount += 1;
      cmCount += result;
    }
  }

  console.log(JSON.stringify({ convertedAssets: assetCount, updatedCmSnapshots: cmCount }, null, 2));
}

function normalize(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

main().finally(() => db.$disconnect());
