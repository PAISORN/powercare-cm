import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { PmWorkStatus } from "./pm-types";

export type PmDashboardScope = {
  organizationId: string;
  plantId: string;
};

export type PmDashboardSummary = Awaited<
  ReturnType<typeof getPmDashboardSummary>
>;

const activeStatuses = [PmWorkStatus.PLANNED, PmWorkStatus.IN_PROGRESS];

export async function getPmDashboardSummary(
  scope: PmDashboardScope,
  todayDateKey: string,
) {
  const monthKey = todayDateKey.slice(0, 7);
  const monthStart = `${monthKey}-01`;
  const monthEnd = endOfMonth(monthKey);
  const yearKey = todayDateKey.slice(0, 4);
  const yearStart = `${yearKey}-01-01`;
  const yearEnd = `${yearKey}-12-31`;
  const trendStart = shiftMonth(monthStart, -5);
  const nextWeekEnd = shiftDate(todayDateKey, 6);
  const scopedPlan = {
    organizationId: scope.organizationId,
    plantId: scope.plantId,
  } satisfies Prisma.PmPlanWhereInput;
  const scopedWork = {
    plantId: scope.plantId,
    pmPlan: scopedPlan,
  } satisfies Prisma.PmWorkWhereInput;

  const [
    monthlyWorks,
    attentionWorks,
    upcomingWorks,
    trendWorks,
    commentWorks,
    annualWorks,
  ] = await Promise.all([
    db.pmWork.findMany({
      where: {
        ...scopedWork,
        pmPlan: {
          ...scopedPlan,
          plannedDateKey: { gte: monthStart, lte: monthEnd },
        },
        status: { not: PmWorkStatus.CANCELED },
      },
      select: {
        id: true,
        status: true,
        assignees: {
          select: {
            role: true,
            user: { select: { id: true, fullName: true } },
          },
          orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
        },
        pmPlan: { select: { plannedDateKey: true } },
      },
    }),
    db.pmWork.findMany({
      where: {
        ...scopedWork,
        OR: [
          {
            status: { in: activeStatuses },
            pmPlan: {
              ...scopedPlan,
              plannedDateKey: { lt: todayDateKey },
            },
          },
          { status: PmWorkStatus.IN_PROGRESS },
        ],
      },
      select: {
        id: true,
        number: true,
        status: true,
        assetCodeSnapshot: true,
        assetNameSnapshot: true,
        pmPlan: { select: { plannedDateKey: true } },
        assignees: {
          select: { user: { select: { fullName: true } } },
          orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
        },
      },
      orderBy: [
        { pmPlan: { plannedDateKey: "asc" } },
        { number: "asc" },
      ],
      take: 6,
    }),
    db.pmWork.findMany({
      where: {
        ...scopedWork,
        pmPlan: {
          ...scopedPlan,
          plannedDateKey: { gte: todayDateKey, lte: nextWeekEnd },
        },
        status: { not: PmWorkStatus.CANCELED },
      },
      select: {
        id: true,
        status: true,
        pmPlan: { select: { plannedDateKey: true } },
      },
      orderBy: [
        { pmPlan: { plannedDateKey: "asc" } },
        { number: "asc" },
      ],
    }),
    db.pmWork.findMany({
      where: {
        ...scopedWork,
        pmPlan: {
          ...scopedPlan,
          plannedDateKey: { gte: trendStart, lte: monthEnd },
        },
        status: { not: PmWorkStatus.CANCELED },
      },
      select: {
        status: true,
        pmPlan: { select: { plannedDateKey: true } },
      },
    }),
    db.pmWork.findMany({
      where: {
        ...scopedWork,
        status: PmWorkStatus.COMPLETED,
        resultNote: { not: null },
      },
      select: {
        id: true,
        number: true,
        result: true,
        resultNote: true,
        assetCodeSnapshot: true,
        assetNameSnapshot: true,
        completedAt: true,
        completedBy: { select: { fullName: true } },
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    db.pmWork.findMany({
      where: {
        ...scopedWork,
        pmPlan: {
          ...scopedPlan,
          plannedDateKey: { gte: yearStart, lte: yearEnd },
        },
      },
      select: {
        status: true,
        pmPlan: { select: { plannedDateKey: true } },
      },
    }),
  ]);

  const completed = monthlyWorks.filter(
    (work) => work.status === PmWorkStatus.COMPLETED,
  ).length;
  const inProgress = monthlyWorks.filter(
    (work) => work.status === PmWorkStatus.IN_PROGRESS,
  ).length;
  const planned = monthlyWorks.filter(
    (work) => work.status === PmWorkStatus.PLANNED,
  ).length;
  const overdue = monthlyWorks.filter(
    (work) =>
      activeStatuses.includes(work.status as (typeof activeStatuses)[number]) &&
      work.pmPlan.plannedDateKey < todayDateKey,
  ).length;
  const today = monthlyWorks.filter(
    (work) => work.pmPlan.plannedDateKey === todayDateKey,
  ).length;
  const total = monthlyWorks.length;
  const annualCompleted = annualWorks.filter(
    (work) => work.status === PmWorkStatus.COMPLETED,
  ).length;
  const annualCanceled = annualWorks.filter(
    (work) => work.status === PmWorkStatus.CANCELED,
  );
  const monthWorks = annualWorks.filter(
    (work) => work.pmPlan.plannedDateKey.slice(0, 7) === monthKey,
  );
  const monthCompleted = monthWorks.filter(
    (work) => work.status === PmWorkStatus.COMPLETED,
  ).length;
  const todayWorks = annualWorks.filter(
    (work) => work.pmPlan.plannedDateKey === todayDateKey,
  );
  const todayCompleted = todayWorks.filter(
    (work) => work.status === PmWorkStatus.COMPLETED,
  ).length;

  return {
    monthKey,
    monthStart,
    monthEnd,
    yearStart,
    yearEnd,
    nextWeekEnd,
    metrics: {
      today,
      inProgress,
      overdue,
      completed,
      planned,
      total,
      completionPercent: total ? Math.round((completed / total) * 100) : 0,
      annualTotal: annualWorks.length,
      annualCompleted,
      annualCompletionPercent: percent(annualCompleted, annualWorks.length),
      monthTotal: monthWorks.length,
      monthCompleted,
      monthCompletionPercent: percent(monthCompleted, monthWorks.length),
      canceledDays: new Set(
        annualCanceled.map((work) => work.pmPlan.plannedDateKey),
      ).size,
      canceledWorks: annualCanceled.length,
      cancellationPercent: percent(annualCanceled.length, annualWorks.length),
      todayTotal: todayWorks.length,
      todayCompleted,
      todayCompletionPercent: percent(todayCompleted, todayWorks.length),
    },
    attentionWorks: attentionWorks.map((work) => ({
      ...work,
      overdue: work.pmPlan.plannedDateKey < todayDateKey,
    })),
    upcomingDays: Array.from({ length: 7 }, (_, index) => {
      const dateKey = shiftDate(todayDateKey, index);
      const works = upcomingWorks.filter(
        (work) => work.pmPlan.plannedDateKey === dateKey,
      );
      return {
        dateKey,
        total: works.length,
        inProgress: works.filter(
          (work) => work.status === PmWorkStatus.IN_PROGRESS,
        ).length,
        completed: works.filter(
          (work) => work.status === PmWorkStatus.COMPLETED,
        ).length,
      };
    }),
    monthlyTrend: buildMonthlyTrend(trendWorks, monthStart, todayDateKey),
    pmComments: commentWorks,
    workload: summarizeWorkload(monthlyWorks, todayDateKey),
  };
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function buildMonthlyTrend(
  works: Array<{
    status: string;
    pmPlan: { plannedDateKey: string };
  }>,
  currentMonthStart: string,
  todayDateKey: string,
) {
  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = shiftMonth(currentMonthStart, index - 5);
    const monthKey = monthStart.slice(0, 7);
    const rows = works.filter(
      (work) => work.pmPlan.plannedDateKey.slice(0, 7) === monthKey,
    );
    const completed = rows.filter(
      (work) => work.status === PmWorkStatus.COMPLETED,
    ).length;
    const inProgress = rows.filter(
      (work) => work.status === PmWorkStatus.IN_PROGRESS,
    ).length;
    const planned = rows.filter(
      (work) => work.status === PmWorkStatus.PLANNED,
    ).length;
    const overdue = rows.filter(
      (work) =>
        activeStatuses.includes(
          work.status as (typeof activeStatuses)[number],
        ) && work.pmPlan.plannedDateKey < todayDateKey,
    ).length;

    return {
      key: monthKey,
      label: formatTrendMonth(monthStart),
      total: rows.length,
      completed,
      inProgress,
      planned,
      overdue,
      completionPercent: rows.length
        ? Math.round((completed / rows.length) * 100)
        : 0,
    };
  });
}

function summarizeWorkload(
  works: Array<{
    status: string;
    pmPlan: { plannedDateKey: string };
    assignees: Array<{
      role: string;
      user: { id: string; fullName: string };
    }>;
  }>,
  todayDateKey: string,
) {
  const byOwner = new Map<
    string,
    {
      id: string;
      name: string;
      total: number;
      completed: number;
      inProgress: number;
      overdue: number;
    }
  >();

  for (const work of works) {
    const lead = work.assignees[0]?.user ?? {
      id: "unassigned",
      fullName: "ยังไม่มอบหมาย",
    };
    const row = byOwner.get(lead.id) ?? {
      id: lead.id,
      name: lead.fullName,
      total: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
    };
    row.total += 1;
    if (work.status === PmWorkStatus.COMPLETED) row.completed += 1;
    if (work.status === PmWorkStatus.IN_PROGRESS) row.inProgress += 1;
    if (
      activeStatuses.includes(work.status as (typeof activeStatuses)[number]) &&
      work.pmPlan.plannedDateKey < todayDateKey
    ) {
      row.overdue += 1;
    }
    byOwner.set(lead.id, row);
  }

  return [...byOwner.values()]
    .sort(
      (left, right) =>
        right.overdue - left.overdue ||
        right.inProgress - left.inProgress ||
        right.total - left.total ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 5);
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function endOfMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function shiftMonth(dateKey: string, months: number) {
  const [year, month] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1))
    .toISOString()
    .slice(0, 10);
}

function formatTrendMonth(dateKey: string) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatPmDashboardMonth(monthKey: string) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T12:00:00Z`));
}

export function formatPmDashboardShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatPmDashboardWeekday(dateKey: string) {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}
