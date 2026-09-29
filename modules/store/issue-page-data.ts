import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import {
  clampIssueTrackingPage,
  ISSUE_TRACKING_PAGE_SIZE,
  issueTrackingStatusGroup,
  issueTrackingStatusValues,
  type IssueTrackingQuery,
} from "./issue-tracking-query";

type IssuePageScope = {
  organizationId: string;
  plantId: string;
};

type LoadIssuePageDataInput = {
  mode: "create" | "tracking";
  scope: IssuePageScope;
  viewerUserId: string;
  canReviewAllIssues: boolean;
  trackingQuery: IssueTrackingQuery;
};

export async function loadIssuePageData(input: LoadIssuePageDataInput) {
  const requestData =
    input.mode === "create"
      ? await loadIssueRequestData(input.scope)
      : emptyIssueRequestData();
  const trackingData =
    input.mode === "tracking"
      ? await loadIssueTrackingData(input)
      : emptyIssueTrackingData(input.trackingQuery);

  return { ...requestData, ...trackingData };
}

async function loadIssueRequestData(scope: IssuePageScope) {
  const [stocks, issueZones, cmWorks] = await Promise.all([
    db.storeStock.findMany({
      where: {
        plantId: scope.plantId,
        quantity: { gt: 0 },
        store: { active: true },
        sparePart: { active: true },
      },
      include: {
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            category: { select: { name: true } },
          },
        },
        sparePart: {
          select: {
            id: true,
            code: true,
            itemCode: true,
            itemKind: true,
            name: true,
            unit: true,
            minStock: true,
            type: { select: { name: true } },
            category: { select: { name: true } },
            materialGroup: { select: { name: true } },
          },
        },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
    }),
    db.storeApplicableZone.findMany({
      where: {
        plantId: scope.plantId,
        active: true,
        zone: { active: true },
      },
      select: { code: true, zone: { select: { id: true, name: true } } },
      orderBy: { code: "asc" },
    }),
    db.cmWork.findMany({
      where: {
        plantId: scope.plantId,
        organizationId: scope.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        number: true,
        problemTitle: true,
        machineName: true,
      },
    }),
  ]);

  return { stocks, issueZones, cmWorks };
}

async function loadIssueTrackingData(input: LoadIssuePageDataInput) {
  const issueVisibilityWhere: Prisma.SparePartIssueWhereInput = {
    organizationId: input.scope.organizationId,
    plantId: input.scope.plantId,
    ...(!input.canReviewAllIssues
      ? { requesterUserId: input.viewerUserId }
      : {}),
  };
  const issueKindWhere: Prisma.SparePartIssueWhereInput = {
    ...issueVisibilityWhere,
    itemKind: input.trackingQuery.itemKind,
  };
  const selectedStatuses = issueTrackingStatusValues(
    input.trackingQuery.status,
  );
  const filteredIssueWhere: Prisma.SparePartIssueWhereInput = {
    ...issueKindWhere,
    ...(selectedStatuses ? { status: { in: selectedStatuses } } : {}),
    ...(input.trackingQuery.search
      ? {
          OR: [
            { number: { contains: input.trackingQuery.search } },
            { requesterName: { contains: input.trackingQuery.search } },
            {
              cmWork: {
                is: { number: { contains: input.trackingQuery.search } },
              },
            },
            {
              requesterUser: {
                is: { fullName: { contains: input.trackingQuery.search } },
              },
            },
            {
              items: {
                some: {
                  OR: [
                    {
                      lineNumber: { contains: input.trackingQuery.search },
                    },
                    {
                      sparePart: {
                        code: { contains: input.trackingQuery.search },
                      },
                    },
                    {
                      sparePart: {
                        name: { contains: input.trackingQuery.search },
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [issueStatusRows, filteredIssueCount] = await Promise.all([
    db.sparePartIssue.findMany({
      where: issueKindWhere,
      select: { status: true },
    }),
    db.sparePartIssue.count({ where: filteredIssueWhere }),
  ]);
  const statusCounts = countIssueStatuses(issueStatusRows);
  const totalTrackingPages = Math.max(
    1,
    Math.ceil(filteredIssueCount / ISSUE_TRACKING_PAGE_SIZE),
  );
  const currentTrackingPage = clampIssueTrackingPage(
    input.trackingQuery.page,
    totalTrackingPages,
  );
  const trackingQuery = {
    ...input.trackingQuery,
    page: currentTrackingPage,
  };
  const pagedFilteredIssues = await db.sparePartIssue.findMany({
    where: filteredIssueWhere,
    include: {
      cmWork: { select: { number: true } },
      requesterUser: { select: { fullName: true } },
      engineer: {
        select: { fullName: true, signature: { select: { id: true } } },
      },
      storeOfficer: {
        select: { fullName: true, signature: { select: { id: true } } },
      },
      items: {
        include: {
          store: { select: { code: true, name: true } },
          sparePart: {
            select: { code: true, name: true, unit: true, itemKind: true },
          },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { requestedAt: "desc" },
    skip: (currentTrackingPage - 1) * ISSUE_TRACKING_PAGE_SIZE,
    take: ISSUE_TRACKING_PAGE_SIZE,
  });

  return {
    statusCounts,
    filteredIssueCount,
    totalTrackingPages,
    currentTrackingPage,
    trackingQuery,
    pagedFilteredIssues,
  };
}

function countIssueStatuses(rows: Array<{ status: string }>) {
  return {
    all: rows.length,
    waiting: rows.filter(
      (issue) => issueTrackingStatusGroup(issue.status) === "WAITING",
    ).length,
    inProgress: rows.filter(
      (issue) => issueTrackingStatusGroup(issue.status) === "IN_PROGRESS",
    ).length,
    completed: rows.filter(
      (issue) => issueTrackingStatusGroup(issue.status) === "COMPLETED",
    ).length,
    canceled: rows.filter(
      (issue) => issueTrackingStatusGroup(issue.status) === "CANCELED",
    ).length,
  };
}

function emptyIssueRequestData() {
  return { stocks: [], issueZones: [], cmWorks: [] };
}

function emptyIssueTrackingData(trackingQuery: IssueTrackingQuery) {
  return {
    statusCounts: {
      all: 0,
      waiting: 0,
      inProgress: 0,
      completed: 0,
      canceled: 0,
    },
    filteredIssueCount: 0,
    totalTrackingPages: 1,
    currentTrackingPage: 1,
    trackingQuery: { ...trackingQuery, page: 1 },
    pagedFilteredIssues: [],
  };
}

export type IssuePageData = Awaited<ReturnType<typeof loadIssuePageData>>;
