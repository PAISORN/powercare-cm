import { PrismaClient } from "@prisma/client";
import { WorkStatus, Urgency } from "../modules/cm-work/cm-work-types";

const db = new PrismaClient();
const batchDepartment = "Demo Overview Batch";
const baseNumber = 9001;

const statusPlan = [
  WorkStatus.NEW,
  WorkStatus.NEW,
  WorkStatus.NEW,
  WorkStatus.NEW,
  WorkStatus.NEW,
  WorkStatus.NEW,
  WorkStatus.NEW,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.CLAIMED,
  WorkStatus.CLAIMED,
  WorkStatus.CLAIMED,
  WorkStatus.CLAIMED,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.IN_PROGRESS,
  WorkStatus.IN_PROGRESS,
  WorkStatus.IN_PROGRESS,
  WorkStatus.IN_PROGRESS,
  WorkStatus.IN_PROGRESS,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
  WorkStatus.RETURNED_FOR_CORRECTION,
  WorkStatus.RETURNED_FOR_CORRECTION,
  WorkStatus.RETURNED_FOR_CORRECTION,
  WorkStatus.RETURNED_FOR_CORRECTION,
  WorkStatus.RETURNED_FOR_CORRECTION,
  WorkStatus.CLOSED,
  WorkStatus.CLOSED,
  WorkStatus.CLOSED,
  WorkStatus.CLOSED,
  WorkStatus.CLOSED,
  WorkStatus.CLOSED,
  WorkStatus.CANCELED,
  WorkStatus.CANCELED,
  WorkStatus.CANCELED,
  WorkStatus.CANCELED,
  WorkStatus.CANCELED,
  WorkStatus.CANCELED,
];

const machineNames = [
  "Fuel Conveyor BC-01",
  "Crusher Motor CR-02",
  "Warehouse Dust Collector",
  "Boiler FD Fan",
  "Turbine Lube Oil Pump",
  "ESP Hopper Heater",
  "RO Feed Pump",
  "Cooling Tower Fan",
  "Forklift Charger",
  "Office MDB Panel",
];

const problemTitles = [
  "Abnormal vibration",
  "High temperature alarm",
  "Intermittent trip",
  "Oil leakage",
  "Low flow detected",
  "Control signal fault",
  "Noise during operation",
  "Breaker warning",
  "Valve actuator slow response",
  "Sensor reading unstable",
];

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(8 + (days % 8), 15, 0, 0);
  return date;
}

function statusDates(status: string, createdAt: Date) {
  const claimedAt = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
  const inProgressAt = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000);
  const waitingToCloseAt = new Date(createdAt.getTime() + 28 * 60 * 60 * 1000);
  const closedAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const canceledAt = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);

  return {
    claimedAt: [WorkStatus.CLAIMED, WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CLOSED].includes(status as never)
      ? claimedAt
      : null,
    inProgressAt: [WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CLOSED].includes(status as never)
      ? inProgressAt
      : null,
    waitingToCloseAt: [WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CLOSED].includes(status as never)
      ? waitingToCloseAt
      : null,
    closedAt: status === WorkStatus.CLOSED ? closedAt : null,
    canceledAt: status === WorkStatus.CANCELED ? canceledAt : null,
  };
}

async function main() {
  const [categories, zones, users] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    db.zone.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    db.user.findMany({ where: { active: true }, include: { category: true } }),
  ]);

  if (categories.length < 2 || zones.length < 1) {
    throw new Error("Master data is missing. Run npm.cmd run db:seed first.");
  }

  const technicians = users.filter((user) => user.role === "TECHNICIAN" && user.categoryId);
  const engineers = users.filter((user) => user.role === "ENGINEER" && user.categoryId);

  if (!technicians.length || !engineers.length) {
    throw new Error("Demo users are missing. Run npm.cmd run db:seed first.");
  }

  for (let index = 0; index < statusPlan.length; index += 1) {
    const status = statusPlan[index];
    const category = categories[index % categories.length];
    const zone = zones[index % zones.length];
    const technician = technicians.find((user) => user.categoryId === category.id) ?? technicians[0];
    const engineer = engineers.find((user) => user.categoryId === category.id) ?? engineers[0];
    const createdAt = daysAgo(index * 2);
    const dates = statusDates(status, createdAt);
    const hasClaimant = Boolean(dates.claimedAt || status === WorkStatus.RETURNED_FOR_CORRECTION);
    const needsWorkDetail = [WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CLOSED].includes(status as never);

    const number = `CM-2026-06-${String(baseNumber + index).padStart(4, "0")}`;
    const data = {
      number,
      requesterName: `Demo Requester ${String(index + 1).padStart(2, "0")}`,
      requesterDepartment: batchDepartment,
      categoryId: category.id,
      zoneId: zone.id,
      machineName: machineNames[index % machineNames.length],
      problemTitle: problemTitles[index % problemTitles.length],
      problemDetail: `Demo overview work for ${zone.name} / ${category.name}.`,
      urgency: index % 9 === 0 ? Urgency.CRITICAL : index % 3 === 0 ? Urgency.URGENT : Urgency.NORMAL,
      status,
      claimantId: hasClaimant ? technician.id : null,
      reviewerId: status === WorkStatus.CLOSED || status === WorkStatus.RETURNED_FOR_CORRECTION ? engineer.id : null,
      rootCause: needsWorkDetail ? "Demo root cause for dashboard overview" : null,
      correctiveAction: needsWorkDetail ? "Demo corrective action completed for overview data" : null,
      workNote: needsWorkDetail ? "Demo technician note" : null,
      engineerNote: status === WorkStatus.RETURNED_FOR_CORRECTION ? "Demo return note for correction" : status === WorkStatus.CLOSED ? "Demo work accepted" : null,
      canceledReason: status === WorkStatus.CANCELED ? "Demo canceled for overview" : null,
      releaseReason: status === WorkStatus.WAITING_TO_CLAIM ? "Demo released back to queue" : null,
      returnedReason: status === WorkStatus.RETURNED_FOR_CORRECTION ? "Demo needs additional correction" : null,
      createdAt,
      ...dates,
    };

    await db.cmWork.upsert({
      where: { number },
      update: data,
      create: {
        ...data,
        statusHistory: {
          create: {
            toStatus: status,
            changedById: hasClaimant ? technician.id : null,
            note: "Demo overview batch",
            changedAt: createdAt,
          },
        },
      },
    });
  }

  const summary = await db.cmWork.groupBy({
    by: ["status"],
    where: { requesterDepartment: batchDepartment },
    _count: { _all: true },
  });

  console.log(JSON.stringify({ insertedOrUpdated: statusPlan.length, batchDepartment, summary }, null, 2));
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
