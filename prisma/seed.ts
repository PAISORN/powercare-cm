import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { defaultSla, initialCategories, initialZones } from "../modules/master-data/seed-data";

const RoleName = {
  ADMIN: "ADMIN",
  ENGINEER: "ENGINEER",
  TECHNICIAN: "TECHNICIAN",
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
      role: input.role,
      categoryId: input.categoryId ?? null,
      active: true,
    },
  });
}

async function main() {
  for (const name of initialCategories) {
    await db.category.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  for (const name of initialZones) {
    await db.zone.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  const existingSla = await db.slaSetting.findFirst();
  if (!existingSla) {
    await db.slaSetting.create({ data: defaultSla });
  }

  const electrical = await db.category.findUniqueOrThrow({ where: { name: "งานไฟฟ้า" } });
  const mechanical = await db.category.findUniqueOrThrow({ where: { name: "งานเครื่องกล" } });
  const boiler = await db.zone.findUniqueOrThrow({ where: { name: "Boiler&Combustion" } });

  await upsertUser({
    username: "admin",
    password: "admin1234",
    fullName: "System Admin",
    department: "Maintenance",
    role: RoleName.ADMIN,
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

  await db.cmWork.upsert({
    where: { number: "CM-2026-06-0001" },
    update: {},
    create: {
      number: "CM-2026-06-0001",
      requesterName: "Operator A",
      requesterDepartment: "Operations",
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
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
