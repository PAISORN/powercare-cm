import { db } from "../../lib/db";
import type { AdminSiteScope } from "../admin/admin-site-scope";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { previewAnnualPmRelease } from "./pm-annual-phase2-service";
import {
  listAnnualPmCalendarEntries,
  listPmCalendarPlans,
} from "./pm-calendar-query";
import {
  buildPmScopeQuery,
  pmErrorMessage,
  type PmCalendarQuery,
} from "./pm-calendar-page-model";
import { getPmPlanEditor, previewDraftPmPlan } from "./pm-plan-service";

export type LoadPmCalendarPageDataInput = {
  user: PermissionUserContext;
  scope: AdminSiteScope;
  query: PmCalendarQuery;
  month: string;
  selectedDate: string;
  canManage: boolean;
};

export async function loadPmCalendarPageData({
  user,
  scope,
  query,
  month,
  selectedDate,
  canManage,
}: LoadPmCalendarPageDataInput) {
  const serviceScope = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  };
  const [plans, groups, annualEntries, annualPlan] = await Promise.all([
    listPmCalendarPlans(user, serviceScope, month),
    canManage
      ? db.pmGroup.findMany({
          where: { ...serviceScope, active: true },
          select: { id: true, code: true, name: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    listAnnualPmCalendarEntries(user, serviceScope, month),
    db.pmAnnualPlan.findFirst({
      where: {
        ...serviceScope,
        year: Number(selectedDate.slice(0, 4)),
        status: { in: ["ACTIVE", "DRAFT"] },
        ...(query.annualPlanId ? { id: query.annualPlanId } : {}),
      },
      select: { id: true, status: true },
    }),
  ]);

  const selectedPlanId =
    plans.find((item) => item.id === query.planId)?.id ??
    plans.find((plan) => plan.plannedDateKey === selectedDate)?.id;
  const [annualRelease, plan] = await Promise.all([
    loadAnnualReleasePreview({
      user,
      serviceScope,
      query,
      selectedDate,
      canManage,
      annualPlan,
    }),
    selectedPlanId
      ? getPmPlanEditor(user, { ...serviceScope, planId: selectedPlanId })
      : Promise.resolve(null),
  ]);
  const [preview, confirmedAssets] = await Promise.all([
    plan?.status === "DRAFT"
      ? previewDraftPmPlan(user, { ...serviceScope, planId: plan.id })
      : Promise.resolve(null),
    canManage && plan?.status === "CONFIRMED"
      ? db.asset.findMany({
          where: {
            plantId: serviceScope.plantId,
            registrationStatus: "ACTIVE",
            pmWorks: { none: { pmPlanId: plan.id } },
          },
          select: { id: true, code: true, nameTh: true },
          orderBy: [{ code: "asc" }, { nameTh: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return {
    serviceScope,
    scopeQuery: buildPmScopeQuery(scope),
    plans,
    groups,
    annualEntries,
    annualPlan,
    annualPreview: annualRelease.preview,
    annualPreviewError: annualRelease.error,
    selectedPlanId,
    plan,
    preview,
    confirmedAssets,
    selectedAnnualEntries: annualEntries.filter(
      (item) => item.scheduleDateKey === selectedDate,
    ),
  };
}

async function loadAnnualReleasePreview({
  user,
  serviceScope,
  query,
  selectedDate,
  canManage,
  annualPlan,
}: {
  user: PermissionUserContext;
  serviceScope: { organizationId: string; plantId: string };
  query: PmCalendarQuery;
  selectedDate: string;
  canManage: boolean;
  annualPlan: { id: string; status: string } | null;
}) {
  if (!annualPlan || !canManage || query.release !== "annual") {
    return { preview: null, error: null };
  }
  const pending = await db.pmAnnualSchedule.count({
    where: {
      id: query.scheduleId,
      planId: annualPlan.id,
      scheduleDateKey: selectedDate,
      status: "SCHEDULED",
      releasedAt: null,
      slotKey: { not: null },
    },
  });
  if (!pending || !query.scheduleId) {
    return { preview: null, error: null };
  }

  try {
    return {
      preview: await previewAnnualPmRelease(user, {
        ...serviceScope,
        planId: annualPlan.id,
        scheduleDateKey: selectedDate,
        scheduleIds: [query.scheduleId],
      }),
      error: null,
    };
  } catch (error) {
    return { preview: null, error: pmErrorMessage(error) };
  }
}

export type PmCalendarPageData = Awaited<
  ReturnType<typeof loadPmCalendarPageData>
>;
