import { db } from "../lib/db";

async function main() {
  const plant = await db.plant.findFirstOrThrow({
    where: { active: true },
    include: { zones: true },
  });
  const zone = plant.zones.find((item) => item.name.toLowerCase().includes("boiler")) ?? plant.zones[0];

  const assetClass = await db.assetClass.upsert({
    where: { plantId_nameTh: { plantId: plant.id, nameTh: "เครื่องจักรหนัก" } },
    update: { nameEn: "Heavy Machinery", active: true },
    create: { plantId: plant.id, nameTh: "เครื่องจักรหนัก", nameEn: "Heavy Machinery" },
  });
  const pumpType = await upsertType("PMP", "ปั๊ม", "Pump");
  const motorType = await upsertType("MOT", "มอเตอร์", "Motor");
  const family = await db.assetFamily.upsert({
    where: { plantId_code: { plantId: plant.id, code: "BFP" } },
    update: { nameTh: "ชุดปั๊มน้ำป้อนหม้อไอน้ำ", nameEn: "Boiler Feed Pump", active: true },
    create: { plantId: plant.id, code: "BFP", nameTh: "ชุดปั๊มน้ำป้อนหม้อไอน้ำ", nameEn: "Boiler Feed Pump" },
  });

  const siteCode = plant.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const parent1 = await upsertAsset(`${siteCode}-BFP-001`, { sequence: 1, nameTh: "ชุดปั๊มน้ำป้อนหม้อไอน้ำ หมายเลข 1", nameEn: "Boiler Feed Pump Set 1", operatingStatus: "IN_SERVICE", criticality: "CRITICAL" });
  const pump1 = await upsertAsset(`${siteCode}-BFP-PMP-001`, { parentId: parent1.id, assetTypeId: pumpType.id, componentCode: "PMP", sequence: 1, nameTh: "ปั๊ม BFP หมายเลข 1", nameEn: "BFP Pump 1", operatingStatus: "IN_SERVICE", criticality: "CRITICAL" });
  const motor1 = await upsertAsset(`${siteCode}-BFP-MOT-001`, { parentId: parent1.id, assetTypeId: motorType.id, componentCode: "MOT", sequence: 1, nameTh: "มอเตอร์ BFP หมายเลข 1", nameEn: "BFP Motor 1", operatingStatus: "UNDER_REPAIR", criticality: "HIGH" });
  const parent2 = await upsertAsset(`${siteCode}-BFP-002`, { sequence: 2, nameTh: "ชุดปั๊มน้ำป้อนหม้อไอน้ำ หมายเลข 2", nameEn: "Boiler Feed Pump Set 2", operatingStatus: "STANDBY", criticality: "CRITICAL" });
  const pump2 = await upsertAsset(`${siteCode}-BFP-PMP-002`, { parentId: parent2.id, assetTypeId: pumpType.id, componentCode: "PMP", sequence: 2, nameTh: "ปั๊ม BFP หมายเลข 2", nameEn: "BFP Pump 2", operatingStatus: "STANDBY", criticality: "HIGH" });

  await db.assetSequence.upsert({
    where: { plantId_familyId: { plantId: plant.id, familyId: family.id } },
    update: { lastNumber: { set: 2 } },
    create: { plantId: plant.id, familyId: family.id, lastNumber: 2 },
  });
  console.log(JSON.stringify({ plant: plant.name, assets: [parent1.code, pump1.code, motor1.code, parent2.code, pump2.code] }, null, 2));

  function upsertType(code: string, nameTh: string, nameEn: string) {
    return db.assetType.upsert({
      where: { plantId_code: { plantId: plant.id, code } },
      update: { assetClassId: assetClass.id, nameTh, nameEn, active: true },
      create: { plantId: plant.id, assetClassId: assetClass.id, code, nameTh, nameEn },
    });
  }

  function upsertAsset(code: string, values: Record<string, unknown>) {
    return db.asset.upsert({
      where: { code },
      update: values,
      create: {
        publicToken: `${code.toLowerCase()}-demo`,
        plantId: plant.id,
        familyId: family.id,
        assetClassId: assetClass.id,
        zoneId: zone?.id,
        code,
        nameTh: String(values.nameTh),
        ...values,
      } as never,
    });
  }
}

main().finally(() => db.$disconnect());
