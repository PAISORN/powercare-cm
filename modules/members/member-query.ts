import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { canViewMemberWorkload } from "../auth/permission";
import { WorkStatus } from "../cm-work/cm-work-types";
import type { ParsedCmDateFilter } from "../filters/cm-date-filter";
import { initialCategories } from "../master-data/seed-data";

export type MemberCategoryFilter = "electrical" | "mechanical";

type MetricWork = {
  status: string;
  closedAt: Date | null;
};

type MetricWindow = {
  start: Date;
  endExclusive: Date;
};

const categoryNameByFilter: Record<MemberCategoryFilter, string> = {
  electrical: initialCategories[0],
  mechanical: initialCategories[1],
};

const terminalStatuses = [WorkStatus.CLOSED, WorkStatus.CANCELED];

export function calculateMemberMetrics(works: MetricWork[], window?: MetricWindow) {
  return works.reduce(
    (metrics, work) => {
      if (!terminalStatuses.includes(work.status as (typeof terminalStatuses)[number])) metrics.active += 1;
      if (
        work.status === WorkStatus.CLOSED &&
        work.closedAt &&
        (!window || (work.closedAt >= window.start && work.closedAt < window.endExclusive))
      ) {
        metrics.closed += 1;
      }
      return metrics;
    },
    { active: 0, closed: 0 },
  );
}

export async function getMembers({
  viewerRole,
  category,
  dateFilter,
}: {
  viewerRole: string;
  category?: MemberCategoryFilter;
  dateFilter?: ParsedCmDateFilter;
}) {
  const categoryName = category ? categoryNameByFilter[category] : undefined;
  const members = await db.user.findMany({
    where: {
      active: true,
      ...(categoryName ? { category: { name: categoryName } } : {}),
    },
    include: { category: true, profilePhoto: true },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  if (!canViewMemberWorkload(viewerRole) || members.length === 0) {
    return members.map((member) => ({ ...member, metrics: null }));
  }

  const memberIds = members.map((member) => member.id);
  const categoryWorkWhere: Prisma.CmWorkWhereInput = categoryName ? { category: { name: categoryName } } : {};
  const closedAtWhere =
    dateFilter?.start && dateFilter.endExclusive
      ? { gte: dateFilter.start, lt: dateFilter.endExclusive }
      : undefined;

  const [activeCounts, closedCounts] = await Promise.all([
    db.cmWork.groupBy({
      by: ["claimantId"],
      where: {
        claimantId: { in: memberIds },
        status: { notIn: terminalStatuses },
        ...categoryWorkWhere,
      },
      _count: { _all: true },
    }),
    db.cmWork.groupBy({
      by: ["claimantId"],
      where: {
        claimantId: { in: memberIds },
        status: WorkStatus.CLOSED,
        ...(closedAtWhere ? { closedAt: closedAtWhere } : {}),
        ...categoryWorkWhere,
      },
      _count: { _all: true },
    }),
  ]);

  const activeByMember = new Map(activeCounts.map((row) => [row.claimantId, row._count._all]));
  const closedByMember = new Map(closedCounts.map((row) => [row.claimantId, row._count._all]));

  return members.map((member) => ({
    ...member,
    metrics: {
      active: activeByMember.get(member.id) ?? 0,
      closed: closedByMember.get(member.id) ?? 0,
    },
  }));
}
