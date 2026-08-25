import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { defaultSla, initialCategories, initialZones } from "../modules/master-data/seed-data";
import { defaultOrganizationRecord, defaultPlantRecord } from "../modules/organization/organization-foundation";

const RoleName = {
  ADMIN: "ADMIN",
  ORGANIZATION_ADMIN: "ORGANIZATION_ADMIN",
  SITE_ADMIN: "SITE_ADMIN",
  ENGINEER: "ENGINEER",
  TECHNICIAN: "TECHNICIAN",
  VISITOR: "VISITOR",
} as const;

const Urgency = {
  NORMAL: "NORMAL",
  URGENT: "URGENT",
} as const;

const WorkStatus = {
  NEW: "NEW",
  WAITING_TO_CLOSE: "WAITING_TO_CLOSE",
} as const;

async function upsertUser(input: {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role: (typeof RoleName)[keyof typeof RoleName];
  categoryId?: string | null;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return db.user.upsert({
    where: { username: input.username },
    update: {
      active: true,
      organizationId: defaultOrganizationRecord.id,
      plantId: defaultPlantRecord.id,
      role: input.role,
      categoryId: input.categoryId ?? null,
      fullName: input.fullName,
      department: input.department,
    },
    create: {
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      department: input.department,
      organizationId: defaultOrganizationRecord.id,
      plantId: defaultPlantRecord.id,
      role: input.role,
      categoryId: input.categoryId ?? null,
      active: true,
    },
  });
}

type SampleSparePartFamily = {
  category: string;
  storeCategory: string;
  storeCode: string;
  storeName: string;
  storeLocation: string;
  name: string;
  itemPrefix: string;
  unit: string;
  description: string;
  zones: string[];
  minStock: number;
  maxStock: number;
  latestUnitPrice: number;
};

const sampleSparePartFamilies: SampleSparePartFamily[] = [
  {
    category: "Mechanical",
    storeCategory: "Mechanical Warehouse",
    storeCode: "MECH",
    storeName: "Mechanical Main Store",
    storeLocation: "Warehouse A",
    name: "Deep groove ball bearing",
    itemPrefix: "ACC-MEC-BRG",
    unit: "PCS",
    description: "Rotating equipment bearing for pumps, conveyors, fans, and general mechanical drives.",
    zones: ["Fuel preparation", "Boiler&Combustion", "Turbine", "Cooling Tower", "Vehicle"],
    minStock: 10,
    maxStock: 120,
    latestUnitPrice: 420,
  },
  {
    category: "Mechanical",
    storeCategory: "Mechanical Warehouse",
    storeCode: "MECH",
    storeName: "Mechanical Main Store",
    storeLocation: "Warehouse A",
    name: "Mechanical seal",
    itemPrefix: "ACC-MEC-SEAL",
    unit: "PCS",
    description: "Pump shaft sealing set for water, oil, and process transfer pumps.",
    zones: ["Water Treatment Plant", "Cooling Tower", "Boiler&Combustion", "Turbine", "ESP"],
    minStock: 5,
    maxStock: 60,
    latestUnitPrice: 1850,
  },
  {
    category: "Mechanical",
    storeCategory: "Mechanical Warehouse",
    storeCode: "MECH",
    storeName: "Mechanical Main Store",
    storeLocation: "Warehouse A",
    name: "V-belt",
    itemPrefix: "ACC-MEC-VBLT",
    unit: "PCS",
    description: "Drive belt for conveyor, blower, cooling tower fan, and auxiliary machinery.",
    zones: ["Fuel preparation", "Fuel Warehouse", "Cooling Tower", "Boiler&Combustion", "Other"],
    minStock: 12,
    maxStock: 150,
    latestUnitPrice: 260,
  },
  {
    category: "Mechanical",
    storeCategory: "Mechanical Warehouse",
    storeCode: "MECH",
    storeName: "Mechanical Main Store",
    storeLocation: "Warehouse A",
    name: "Flexible coupling insert",
    itemPrefix: "ACC-MEC-CPL",
    unit: "PCS",
    description: "Elastic coupling insert for pump and motor alignment vibration reduction.",
    zones: ["Water Treatment Plant", "Turbine", "Cooling Tower", "Boiler&Combustion", "Other"],
    minStock: 8,
    maxStock: 80,
    latestUnitPrice: 620,
  },
  {
    category: "Mechanical",
    storeCategory: "Mechanical Warehouse",
    storeCode: "MECH",
    storeName: "Mechanical Main Store",
    storeLocation: "Warehouse A",
    name: "Roller chain",
    itemPrefix: "ACC-MEC-CHAIN",
    unit: "M",
    description: "Power transmission chain for conveyors, feeders, and fuel handling equipment.",
    zones: ["Fuel preparation", "Fuel Warehouse", "Boiler&Combustion", "ESP", "Other"],
    minStock: 15,
    maxStock: 200,
    latestUnitPrice: 190,
  },
  {
    category: "Electrical",
    storeCategory: "Electrical Warehouse",
    storeCode: "ELEC",
    storeName: "Electrical Store",
    storeLocation: "Warehouse B",
    name: "Miniature circuit breaker",
    itemPrefix: "ACC-ELE-MCB",
    unit: "PCS",
    description: "MCB protection device for lighting, control, and auxiliary power circuits.",
    zones: ["Office", "Water Treatment Plant", "Boiler&Combustion", "Turbine", "ESP"],
    minStock: 10,
    maxStock: 100,
    latestUnitPrice: 350,
  },
  {
    category: "Electrical",
    storeCategory: "Electrical Warehouse",
    storeCode: "ELEC",
    storeName: "Electrical Store",
    storeLocation: "Warehouse B",
    name: "Magnetic contactor",
    itemPrefix: "ACC-ELE-CON",
    unit: "PCS",
    description: "Motor starter contactor for pump, fan, conveyor, and feeder control panels.",
    zones: ["Fuel preparation", "Boiler&Combustion", "Cooling Tower", "Water Treatment Plant", "ESP"],
    minStock: 6,
    maxStock: 70,
    latestUnitPrice: 1450,
  },
  {
    category: "Electrical",
    storeCategory: "Electrical Warehouse",
    storeCode: "ELEC",
    storeName: "Electrical Store",
    storeLocation: "Warehouse B",
    name: "Control relay",
    itemPrefix: "ACC-ELE-RLY",
    unit: "PCS",
    description: "Plug-in relay for interlock, alarm, control sequence, and auxiliary logic circuits.",
    zones: ["Office", "Turbine", "Boiler&Combustion", "Water Treatment Plant", "Fuel preparation"],
    minStock: 12,
    maxStock: 120,
    latestUnitPrice: 280,
  },
  {
    category: "Electrical",
    storeCategory: "Electrical Warehouse",
    storeCode: "ELEC",
    storeName: "Electrical Store",
    storeLocation: "Warehouse B",
    name: "Industrial cable",
    itemPrefix: "ACC-ELE-CBL",
    unit: "M",
    description: "Power and control cable for field devices, motors, panels, and cable tray routing.",
    zones: ["Fuel preparation", "Boiler&Combustion", "Turbine", "Cooling Tower", "Office"],
    minStock: 100,
    maxStock: 1500,
    latestUnitPrice: 45,
  },
  {
    category: "Electrical",
    storeCategory: "Electrical Warehouse",
    storeCode: "ELEC",
    storeName: "Electrical Store",
    storeLocation: "Warehouse B",
    name: "LED industrial lamp",
    itemPrefix: "ACC-ELE-LAMP",
    unit: "PCS",
    description: "High bay and area lighting replacement for plant indoor and outdoor locations.",
    zones: ["Office", "Fuel Warehouse", "Boiler&Combustion", "Water Treatment Plant", "Other"],
    minStock: 8,
    maxStock: 80,
    latestUnitPrice: 980,
  },
  {
    category: "Instrument",
    storeCategory: "Instrument Warehouse",
    storeCode: "INST",
    storeName: "Instrument Store",
    storeLocation: "Warehouse C",
    name: "Pressure transmitter",
    itemPrefix: "ACC-INS-PT",
    unit: "PCS",
    description: "Field pressure measurement device for process monitoring and control loops.",
    zones: ["Boiler&Combustion", "Turbine", "Water Treatment Plant", "ESP", "Other"],
    minStock: 3,
    maxStock: 30,
    latestUnitPrice: 9200,
  },
  {
    category: "Instrument",
    storeCategory: "Instrument Warehouse",
    storeCode: "INST",
    storeName: "Instrument Store",
    storeLocation: "Warehouse C",
    name: "Temperature sensor",
    itemPrefix: "ACC-INS-TEMP",
    unit: "PCS",
    description: "RTD or thermocouple sensor for bearing, process, and equipment temperature points.",
    zones: ["Boiler&Combustion", "Turbine", "Water Treatment Plant", "Cooling Tower", "ESP"],
    minStock: 5,
    maxStock: 50,
    latestUnitPrice: 1600,
  },
  {
    category: "Instrument",
    storeCategory: "Instrument Warehouse",
    storeCode: "INST",
    storeName: "Instrument Store",
    storeLocation: "Warehouse C",
    name: "Proximity sensor",
    itemPrefix: "ACC-INS-PROX",
    unit: "PCS",
    description: "Inductive sensor for speed pickup, position confirmation, and conveyor protection.",
    zones: ["Fuel preparation", "Fuel Warehouse", "Boiler&Combustion", "ESP", "Other"],
    minStock: 6,
    maxStock: 60,
    latestUnitPrice: 850,
  },
  {
    category: "Instrument",
    storeCategory: "Instrument Warehouse",
    storeCode: "INST",
    storeName: "Instrument Store",
    storeLocation: "Warehouse C",
    name: "Signal isolator",
    itemPrefix: "ACC-INS-ISO",
    unit: "PCS",
    description: "Analog signal isolation module for PLC, DCS, transmitter, and field loop protection.",
    zones: ["Turbine", "Boiler&Combustion", "Water Treatment Plant", "Office", "Other"],
    minStock: 4,
    maxStock: 40,
    latestUnitPrice: 2400,
  },
  {
    category: "Hydraulic & Pneumatic",
    storeCategory: "Hydraulic & Pneumatic Store",
    storeCode: "HYPN",
    storeName: "Hydraulic Pneumatic Store",
    storeLocation: "Warehouse D",
    name: "Hydraulic hose",
    itemPrefix: "ACC-HYD-HOSE",
    unit: "PCS",
    description: "Flexible hydraulic hose assembly for cylinders, pumps, lubrication, and pressure lines.",
    zones: ["Fuel preparation", "Vehicle", "Boiler&Combustion", "Turbine", "Other"],
    minStock: 6,
    maxStock: 80,
    latestUnitPrice: 780,
  },
  {
    category: "Hydraulic & Pneumatic",
    storeCategory: "Hydraulic & Pneumatic Store",
    storeCode: "HYPN",
    storeName: "Hydraulic Pneumatic Store",
    storeLocation: "Warehouse D",
    name: "Pneumatic solenoid valve",
    itemPrefix: "ACC-PNE-SV",
    unit: "PCS",
    description: "Air solenoid valve for actuator, damper, cylinder, and instrument air control.",
    zones: ["Boiler&Combustion", "ESP", "Fuel preparation", "Water Treatment Plant", "Other"],
    minStock: 5,
    maxStock: 50,
    latestUnitPrice: 1250,
  },
  {
    category: "Consumable",
    storeCategory: "Consumable Store",
    storeCode: "CONS",
    storeName: "Consumable Store",
    storeLocation: "Warehouse E",
    name: "Lithium grease",
    itemPrefix: "ACC-CON-GRS",
    unit: "KG",
    description: "General purpose grease for bearings, linkages, couplings, and rotating equipment.",
    zones: ["Fuel preparation", "Boiler&Combustion", "Turbine", "Cooling Tower", "Vehicle"],
    minStock: 20,
    maxStock: 300,
    latestUnitPrice: 155,
  },
  {
    category: "Consumable",
    storeCategory: "Consumable Store",
    storeCode: "CONS",
    storeName: "Consumable Store",
    storeLocation: "Warehouse E",
    name: "Hydraulic oil",
    itemPrefix: "ACC-CON-OIL",
    unit: "L",
    description: "Industrial hydraulic oil for power packs, valves, cylinders, and mobile equipment.",
    zones: ["Vehicle", "Fuel preparation", "Boiler&Combustion", "Turbine", "Other"],
    minStock: 50,
    maxStock: 600,
    latestUnitPrice: 120,
  },
  {
    category: "Safety",
    storeCategory: "Safety Store",
    storeCode: "SAFE",
    storeName: "Safety Store",
    storeLocation: "Warehouse F",
    name: "Heat resistant gloves",
    itemPrefix: "ACC-SAF-GLV",
    unit: "PAIR",
    description: "Personal protective gloves for hot surface, welding, and maintenance work.",
    zones: ["Boiler&Combustion", "Turbine", "ESP", "Fuel Warehouse", "Other"],
    minStock: 20,
    maxStock: 200,
    latestUnitPrice: 180,
  },
  {
    category: "Water Treatment",
    storeCategory: "Chemical Warehouse",
    storeCode: "CHEM",
    storeName: "Chemical Store",
    storeLocation: "Warehouse G",
    name: "Chemical dosing pump kit",
    itemPrefix: "ACC-WTP-DP",
    unit: "SET",
    description: "Maintenance kit for chemical dosing pump diaphragm, check valve, and seal parts.",
    zones: ["Water Treatment Plant", "Boiler&Combustion", "Cooling Tower", "Other", "Office"],
    minStock: 2,
    maxStock: 25,
    latestUnitPrice: 3800,
  },
  {
    category: "Boiler",
    storeCategory: "Boiler Store",
    storeCode: "BOIL",
    storeName: "Boiler Spare Store",
    storeLocation: "Warehouse H",
    name: "Boiler gasket",
    itemPrefix: "ACC-BLR-GSK",
    unit: "PCS",
    description: "High temperature gasket for boiler manhole, flange, inspection door, and steam service.",
    zones: ["Boiler&Combustion", "Turbine", "ESP", "Other", "Water Treatment Plant"],
    minStock: 10,
    maxStock: 100,
    latestUnitPrice: 310,
  },
  {
    category: "Tools",
    storeCategory: "Tool Room",
    storeCode: "TOOL",
    storeName: "Tool Room",
    storeLocation: "Maintenance Shop",
    name: "Cutting disc",
    itemPrefix: "ACC-TOL-DISC",
    unit: "PCS",
    description: "Abrasive cutting disc for steel pipe, plate, bracket, and general fabrication work.",
    zones: ["Other", "Fuel preparation", "Vehicle", "Boiler&Combustion", "Office"],
    minStock: 30,
    maxStock: 400,
    latestUnitPrice: 35,
  },
];

const sampleVariants = ["A", "B", "C", "D", "E"] as const;

async function seedSampleSpareParts() {
  const plantRecord = await db.plant.findUniqueOrThrow({
    where: { id: defaultPlantRecord.id },
    select: { inventoryCode: true },
  });
  const inventoryCode = plantRecord.inventoryCode ?? "PWC";
  if (!plantRecord.inventoryCode) {
    await db.plant.update({
      where: { id: defaultPlantRecord.id },
      data: { inventoryCode },
    });
  }

  const zoneByName = new Map(
    (
      await db.zone.findMany({
        where: { plantId: defaultPlantRecord.id, active: true },
        select: { id: true, name: true },
      })
    ).map((zone) => [zone.name, zone.id]),
  );

  const storeCategoryByName = new Map<string, string>();
  const storeByCode = new Map<string, string>();
  const sparePartCategoryByName = new Map<string, string>();

  for (const family of sampleSparePartFamilies) {
    if (!storeCategoryByName.has(family.storeCategory)) {
      const storeCategory = await db.storeCategory.upsert({
        where: { plantId_name: { plantId: defaultPlantRecord.id, name: family.storeCategory } },
        update: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          description: `${family.storeCategory} for sample inventory data`,
          active: true,
        },
        create: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          name: family.storeCategory,
          description: `${family.storeCategory} for sample inventory data`,
          active: true,
        },
      });
      storeCategoryByName.set(family.storeCategory, storeCategory.id);
    }

    if (!storeByCode.has(family.storeCode)) {
      const store = await db.store.upsert({
        where: { plantId_code: { plantId: defaultPlantRecord.id, code: family.storeCode } },
        update: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          categoryId: storeCategoryByName.get(family.storeCategory) ?? null,
          name: family.storeName,
          location: family.storeLocation,
          active: true,
        },
        create: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          categoryId: storeCategoryByName.get(family.storeCategory) ?? null,
          code: family.storeCode,
          name: family.storeName,
          location: family.storeLocation,
          active: true,
        },
      });
      storeByCode.set(family.storeCode, store.id);
    }

    if (!sparePartCategoryByName.has(family.category)) {
      const category = await db.sparePartCategory.upsert({
        where: { plantId_name: { plantId: defaultPlantRecord.id, name: family.category } },
        update: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          description: `${family.category} spare parts`,
          active: true,
        },
        create: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          name: family.category,
          description: `${family.category} spare parts`,
          active: true,
        },
      });
      sparePartCategoryByName.set(family.category, category.id);
    }
  }

  const configuredZoneIds = [
    ...new Set(
      sampleSparePartFamilies
        .flatMap((family) => family.zones)
        .map((zoneName) => zoneByName.get(zoneName))
        .filter((zoneId): zoneId is string => Boolean(zoneId)),
    ),
  ];
  await db.storeApplicableZone.deleteMany({ where: { plantId: defaultPlantRecord.id } });
  if (configuredZoneIds.length) {
    await db.storeApplicableZone.createMany({
      data: configuredZoneIds.map((zoneId, index) => ({
        organizationId: defaultOrganizationRecord.id,
        plantId: defaultPlantRecord.id,
        zoneId,
        code: String(index + 1).padStart(2, "0"),
        active: true,
      })),
    });
  }

  let runningNumber = 0;
  for (const family of sampleSparePartFamilies) {
    for (const variant of sampleVariants) {
      runningNumber += 1;
      const code = `SP-${inventoryCode}-${String(runningNumber).padStart(5, "0")}`;
      const variantIndex = sampleVariants.indexOf(variant) + 1;
      const name = `${family.name} ${variant}`;
      const part = await db.sparePart.upsert({
        where: { plantId_code: { plantId: defaultPlantRecord.id, code } },
        update: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          categoryId: sparePartCategoryByName.get(family.category) ?? null,
          itemCode: `${family.itemPrefix}-${String(variantIndex).padStart(2, "0")}`,
          name,
          description: `${family.description} Sample variant ${variant} for ${family.zones.join(", ")}.`,
          unit: family.unit,
          minStock: family.minStock + variantIndex,
          maxStock: family.maxStock + variantIndex * 5,
          latestUnitPrice: family.latestUnitPrice + variantIndex * 25,
          active: true,
        },
        create: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          categoryId: sparePartCategoryByName.get(family.category) ?? null,
          code,
          itemCode: `${family.itemPrefix}-${String(variantIndex).padStart(2, "0")}`,
          name,
          description: `${family.description} Sample variant ${variant} for ${family.zones.join(", ")}.`,
          unit: family.unit,
          minStock: family.minStock + variantIndex,
          maxStock: family.maxStock + variantIndex * 5,
          latestUnitPrice: family.latestUnitPrice + variantIndex * 25,
          active: true,
        },
        select: { id: true },
      });

      const storeId = storeByCode.get(family.storeCode);
      if (!storeId) continue;
      const quantity = family.minStock + variantIndex * 7 + (runningNumber % 9);
      await db.storeStock.upsert({
        where: { storeId_sparePartId: { storeId, sparePartId: part.id } },
        update: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          quantity,
        },
        create: {
          organizationId: defaultOrganizationRecord.id,
          plantId: defaultPlantRecord.id,
          storeId,
          sparePartId: part.id,
          quantity,
        },
      });
    }
  }

  await db.sparePartSequence.upsert({
    where: { plantId: defaultPlantRecord.id },
    update: { lastNumber: { set: Math.max(runningNumber, 110) } },
    create: { plantId: defaultPlantRecord.id, lastNumber: Math.max(runningNumber, 110) },
  });
}

async function main() {
  await db.organization.upsert({
    where: { id: defaultOrganizationRecord.id },
    update: {
      slug: defaultOrganizationRecord.slug,
      name: defaultOrganizationRecord.name,
      active: true,
    },
    create: {
      ...defaultOrganizationRecord,
      active: true,
    },
  });

  await db.plant.upsert({
    where: { id: defaultPlantRecord.id },
    update: {
      organizationId: defaultPlantRecord.organizationId,
      code: defaultPlantRecord.code,
      name: defaultPlantRecord.name,
      active: true,
    },
    create: {
      ...defaultPlantRecord,
      active: true,
    },
  });

  for (const name of initialCategories) {
    await db.category.upsert({
      where: { plantId_name: { plantId: defaultPlantRecord.id, name } },
      update: { active: true, organizationId: defaultOrganizationRecord.id, plantId: defaultPlantRecord.id },
      create: { name, active: true, organizationId: defaultOrganizationRecord.id, plantId: defaultPlantRecord.id },
    });
  }

  for (const name of initialZones) {
    await db.zone.upsert({
      where: { plantId_name: { plantId: defaultPlantRecord.id, name } },
      update: { active: true, plantId: defaultPlantRecord.id },
      create: { name, active: true, plantId: defaultPlantRecord.id },
    });
  }

  const existingSla = await db.slaSetting.findFirst();
  if (!existingSla) {
    await db.slaSetting.create({ data: defaultSla });
  }

  await db.systemSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      engineerWorkAssignmentEnabled: false,
    },
  });

  const electrical = await db.category.findUniqueOrThrow({
    where: { plantId_name: { plantId: defaultPlantRecord.id, name: initialCategories[0] } },
  });
  const mechanical = await db.category.findUniqueOrThrow({
    where: { plantId_name: { plantId: defaultPlantRecord.id, name: initialCategories[1] } },
  });
  const boiler = await db.zone.findUniqueOrThrow({
    where: { plantId_name: { plantId: defaultPlantRecord.id, name: "Boiler&Combustion" } },
  });
  await upsertUser({
    username: "admin",
    password: "admin1234",
    fullName: "System Admin",
    department: "Maintenance",
    role: RoleName.ADMIN,
  });

  await upsertUser({
    username: "org-admin",
    password: "password1234",
    fullName: "Organization Admin",
    department: "Management",
    role: RoleName.ORGANIZATION_ADMIN,
  });

  await upsertUser({
    username: "site-admin",
    password: "password1234",
    fullName: "Site Admin",
    department: "Maintenance",
    role: RoleName.SITE_ADMIN,
  });

  const engineerElectrical = await upsertUser({
    username: "engineer-electrical",
    password: "password1234",
    fullName: "Electrical Engineer",
    department: "Maintenance",
    role: RoleName.ENGINEER,
    categoryId: electrical.id,
  });

  await upsertUser({
    username: "engineer-mechanical",
    password: "password1234",
    fullName: "Mechanical Engineer",
    department: "Maintenance",
    role: RoleName.ENGINEER,
    categoryId: mechanical.id,
  });

  const techElectrical = await upsertUser({
    username: "tech-electrical",
    password: "password1234",
    fullName: "Electrical Technician",
    department: "Maintenance",
    role: RoleName.TECHNICIAN,
    categoryId: electrical.id,
  });

  await upsertUser({
    username: "tech-mechanical",
    password: "password1234",
    fullName: "Mechanical Technician",
    department: "Maintenance",
    role: RoleName.TECHNICIAN,
    categoryId: mechanical.id,
  });

  await upsertUser({
    username: "visitor",
    password: "password1234",
    fullName: "Visitor",
    department: "Operations",
    role: RoleName.VISITOR,
  });

  await db.cmWork.upsert({
    where: { number: "CM-2026-06-0001" },
    update: {},
    create: {
      number: "CM-2026-06-0001",
      requesterName: "Operator A",
      requesterDepartment: "Operations",
      organizationId: defaultOrganizationRecord.id,
      plantId: defaultPlantRecord.id,
      categoryId: electrical.id,
      zoneId: boiler.id,
      machineName: "Feed Pump",
      problemTitle: "Pump vibration",
      problemDetail: "Vibration detected during operation",
      urgency: Urgency.URGENT,
      status: WorkStatus.NEW,
      statusHistory: {
        create: {
          toStatus: WorkStatus.NEW,
          note: "Seed repair request",
        },
      },
    },
  });

  await db.cmWork.upsert({
    where: { number: "CM-2026-06-0002" },
    update: {},
    create: {
      number: "CM-2026-06-0002",
      requesterName: "Operator B",
      requesterDepartment: "Operations",
      organizationId: defaultOrganizationRecord.id,
      plantId: defaultPlantRecord.id,
      categoryId: electrical.id,
      zoneId: boiler.id,
      machineName: "Lighting Panel",
      problemTitle: "Panel breaker trip",
      problemDetail: "Breaker trips intermittently",
      urgency: Urgency.NORMAL,
      status: WorkStatus.WAITING_TO_CLOSE,
      claimantId: techElectrical.id,
      reviewerId: engineerElectrical.id,
      claimedAt: new Date("2026-06-07T08:00:00+07:00"),
      inProgressAt: new Date("2026-06-07T09:00:00+07:00"),
      waitingToCloseAt: new Date("2026-06-07T11:00:00+07:00"),
      rootCause: "Loose terminal connection",
      correctiveAction: "Tightened terminal and verified load current",
      workNote: "Ready for engineer review",
      statusHistory: {
        create: {
          toStatus: WorkStatus.WAITING_TO_CLOSE,
          changedById: techElectrical.id,
          note: "Seed waiting-to-close work",
        },
      },
    },
  });

  await seedSampleSpareParts();
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
