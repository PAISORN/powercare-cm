import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const preferredZoneOrder = [
  "Fuel preparation",
  "Fuel Warehouse",
  "Boiler&Combustion",
  "Turbine",
  "ESP",
  "Water Treatment Plant",
  "Cooling Tower",
  "Vehicle",
  "Office",
  "Other",
];

function zoneRank(name: string) {
  const index = preferredZoneOrder.findIndex((entry) => entry.localeCompare(name, undefined, { sensitivity: "base" }) === 0);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

try {
  const databaseUrl = process.env.DATABASE_URL?.trim().toLowerCase() ?? "";
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("This repair utility is restricted to the local SQLite Development database.");
  }

  const plants = await db.plant.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      organizationId: true,
      zones: {
        where: { active: true },
        select: { id: true, name: true },
      },
      storeApplicableZones: {
        select: { zoneId: true, code: true },
      },
    },
  });

  const report: Array<{ site: string; created: number; existing: number }> = [];
  for (const plant of plants) {
    const existingZoneIds = new Set(plant.storeApplicableZones.map((entry) => entry.zoneId));
    const usedCodes = new Set(plant.storeApplicableZones.map((entry) => entry.code));
    const missing = [...plant.zones]
      .filter((zone) => !existingZoneIds.has(zone.id))
      .sort((a, b) => zoneRank(a.name) - zoneRank(b.name) || a.name.localeCompare(b.name));

    let nextNumber = 1;
    for (const zone of missing) {
      while (usedCodes.has(String(nextNumber).padStart(2, "0"))) nextNumber += 1;
      const code = String(nextNumber).padStart(2, "0");
      await db.storeApplicableZone.create({
        data: {
          organizationId: plant.organizationId,
          plantId: plant.id,
          zoneId: zone.id,
          code,
          active: true,
        },
      });
      usedCodes.add(code);
      nextNumber += 1;
    }

    report.push({ site: plant.name, created: missing.length, existing: plant.storeApplicableZones.length });
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  await db.$disconnect();
}
