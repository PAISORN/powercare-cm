import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { ReportFilter } from "./report-filter";
import type { ReportScope } from "./report-scope";

export function buildReportWhere(filter: ReportFilter, scope?: ReportScope): Prisma.CmWorkWhereInput {
  return {
    ...(scope?.plantId ? { plantId: scope.plantId } : scope?.organizationId ? { organizationId: scope.organizationId } : {}),
    ...(filter.dateFilter.start && filter.dateFilter.endExclusive
      ? { createdAt: { gte: filter.dateFilter.start, lt: filter.dateFilter.endExclusive } }
      : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(filter.zoneId ? { zoneId: filter.zoneId } : {}),
    ...(filter.urgency ? { urgency: filter.urgency } : {}),
    ...(filter.claimantId ? { claimantId: filter.claimantId } : {}),
    ...(filter.requester ? { requesterName: { contains: filter.requester } } : {}),
    ...(filter.department ? { requesterDepartment: { contains: filter.department } } : {}),
    ...(filter.machineName ? { machineName: { contains: filter.machineName } } : {}),
    ...(filter.number ? { number: { contains: filter.number } } : {}),
  };
}

const reportInclude = {
  category: true,
  zone: true,
  claimant: true,
  reviewer: true,
} satisfies Prisma.CmWorkInclude;

export async function queryReportPreview(filter: ReportFilter, take = 50, scope?: ReportScope) {
  const where = buildReportWhere(filter, scope);
  const [rows, total] = await Promise.all([
    db.cmWork.findMany({ where, include: reportInclude, orderBy: { createdAt: "desc" }, take }),
    db.cmWork.count({ where }),
  ]);
  return { rows, total };
}

export function queryReportRows(filter: ReportFilter, scope?: ReportScope) {
  return db.cmWork.findMany({
    where: buildReportWhere(filter, scope),
    include: reportInclude,
    orderBy: { createdAt: "desc" },
  });
}

export type ReportWorkRow = Awaited<ReturnType<typeof queryReportRows>>[number];
