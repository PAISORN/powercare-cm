"use server";

import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { requireUser } from "../../lib/session";
import { canExecutePmWork, canManagePmPlans } from "../../modules/auth/permission";
import { releaseAnnualPmDay } from "../../modules/pm/pm-annual-phase2-service";
import { activateAnnualPmPlan } from "../../modules/pm/pm-annual-service";
import {
  addDraftPmGroup,
  confirmPmPlan,
  createOrGetDraftPmPlan,
  deleteDraftPmPlan,
  removeDraftPmGroup,
  rescheduleDraftPmPlan,
} from "../../modules/pm/pm-plan-service";
import { resolvePmPageScope } from "../../modules/pm/pm-page-scope";
import {
  addAssetToConfirmedPmPlan,
  cancelConfirmedPmPlan,
  rescheduleConfirmedPmPlan,
} from "../../modules/pm/pm-work-service";
import {
  buildPmCalendarUrl as url,
  pmErrorMessage as errorMessage,
  validPmCalendarView as validView,
} from "../../modules/pm/pm-calendar-page-model";

async function actionContext(formData: FormData) {
  const user = await requireUser();
  if (!canManagePmPlans(user)) redirect("/dashboardpm");
  const resolvedScope = await resolvePmPageScope(user, {
    organizationId: String(formData.get("organizationId") ?? ""),
    plantId: String(formData.get("plantId") ?? ""),
  });
  const scope = {
    ...resolvedScope,
    calendarView: validView(String(formData.get("calendarView") ?? "")),
  };
  return {
    user,
    scope,
    serviceScope: {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    },
    planId: String(formData.get("planId") ?? ""),
  };
}
export async function createPlan(data: FormData) {
  "use server";
  const { user, scope, serviceScope } = await actionContext(data);
  const date = String(data.get("plannedDateKey") ?? "");
  let plan;
  try {
    plan = await createOrGetDraftPmPlan(user, {
      ...serviceScope,
      plannedDateKey: date,
      submissionKey: String(data.get("submissionKey") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, { month: date.slice(0, 7), date, error: errorMessage(error) }),
    );
  }
  redirect(
    url(scope, {
      month: date.slice(0, 7),
      date,
      planId: plan.id,
      saved: "created",
    }),
  );
}
export async function addGroup(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const date = String(data.get("currentDate") ?? "");
  try {
    await addDraftPmGroup(user, {
      ...serviceScope,
      planId,
      groupId: String(data.get("groupId") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: date.slice(0, 7),
        date,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, { month: date.slice(0, 7), date, planId, saved: "group-added" }),
  );
}
export async function removeGroup(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const date = String(data.get("currentDate") ?? "");
  try {
    await removeDraftPmGroup(user, {
      ...serviceScope,
      planId,
      groupId: String(data.get("groupId") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: date.slice(0, 7),
        date,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, {
      month: date.slice(0, 7),
      date,
      planId,
      saved: "group-removed",
    }),
  );
}
export async function reschedule(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const currentDate = String(data.get("currentDate") ?? "");
  const date = String(data.get("plannedDateKey") ?? "");
  try {
    await rescheduleDraftPmPlan(user, {
      ...serviceScope,
      planId,
      plannedDateKey: date,
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: currentDate.slice(0, 7),
        date: currentDate,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, { month: date.slice(0, 7), date, planId, saved: "rescheduled" }),
  );
}
export async function deletePlan(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const currentDate = String(data.get("currentDate") ?? "");
  try {
    await deleteDraftPmPlan(user, { ...serviceScope, planId });
  } catch (error) {
    redirect(
      url(scope, {
        month: currentDate.slice(0, 7),
        date: currentDate,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, {
      month: currentDate.slice(0, 7),
      date: currentDate,
      saved: "deleted",
    }),
  );
}
export async function confirmPlan(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const currentDate = String(data.get("currentDate") ?? "");
  try {
    await confirmPmPlan(user, {
      ...serviceScope,
      planId,
      submissionKey: String(data.get("submissionKey") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: currentDate.slice(0, 7),
        date: currentDate,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, {
      month: currentDate.slice(0, 7),
      date: currentDate,
      planId,
      saved: "confirmed",
    }),
  );
}
export async function addConfirmedAsset(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const currentDate = String(data.get("currentDate") ?? "");
  try {
    await addAssetToConfirmedPmPlan(user, {
      ...serviceScope,
      planId,
      assetId: String(data.get("assetId") ?? ""),
      reason: String(data.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: currentDate.slice(0, 7),
        date: currentDate,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, {
      month: currentDate.slice(0, 7),
      date: currentDate,
      planId,
      saved: "asset-added",
    }),
  );
}
export async function rescheduleConfirmed(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const currentDate = String(data.get("currentDate") ?? "");
  const date = String(data.get("plannedDateKey") ?? "");
  try {
    await rescheduleConfirmedPmPlan(user, {
      ...serviceScope,
      planId,
      plannedDateKey: date,
      reason: String(data.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: currentDate.slice(0, 7),
        date: currentDate,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, {
      month: date.slice(0, 7),
      date,
      planId,
      saved: "confirmed-rescheduled",
    }),
  );
}
export async function cancelConfirmed(data: FormData) {
  "use server";
  const { user, scope, serviceScope, planId } = await actionContext(data);
  const currentDate = String(data.get("currentDate") ?? "");
  try {
    await cancelConfirmedPmPlan(user, {
      ...serviceScope,
      planId,
      reason: String(data.get("reason") ?? ""),
    });
  } catch (error) {
    redirect(
      url(scope, {
        month: currentDate.slice(0, 7),
        date: currentDate,
        planId,
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    url(scope, {
      month: currentDate.slice(0, 7),
      date: currentDate,
      saved: "confirmed-canceled",
    }),
  );
}

export async function releaseAnnual(data: FormData) {
  "use server";
  const user = await requireUser();
  const canManage = canManagePmPlans(user);
  const canExecute = canExecutePmWork(user);
  if (!canManage && !canExecute) redirect("/dashboardpm");
  const scope = await resolvePmPageScope(user, {
    organizationId: String(data.get("organizationId") ?? ""),
    plantId: String(data.get("plantId") ?? ""),
  });
  const serviceScope = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  };
  const date = String(data.get("releaseDateKey") ?? "");
  const annualPlanId = String(data.get("annualPlanId") ?? "");
  const all = data.getAll("allAssetIds").map(String);
  const included = new Set(data.getAll("includedAssetIds").map(String));
  const exclusions = all
    .filter((id) => !included.has(id))
    .map((assetId) => ({
      assetId,
      reason: String(data.get(`exclusionReason:${assetId}`) ?? ""),
    }));
  const scheduleIds = data.getAll("releaseScheduleIds").map(String).filter(Boolean);
  const scheduleId = scheduleIds[0] ?? "";
  const submittedLeadUserId = String(data.get("leadUserId") ?? "").trim();
  const leadUserId = submittedLeadUserId || (!canManage ? user.id : "");
  const collaboratorUserIds = data
    .getAll("collaboratorUserIds")
    .map(String)
    .filter(Boolean);
  try {
    const annualPlan = await db.pmAnnualPlan.findFirstOrThrow({
      where: { id: annualPlanId, ...serviceScope },
      select: { status: true },
    });
    if (annualPlan.status === "DRAFT" && !canManage)
      throw new Error("Only a PM plan manager can activate a Draft Annual PM Plan");
    if (annualPlan.status === "DRAFT")
      await activateAnnualPmPlan(user, {
        ...serviceScope,
        planId: annualPlanId,
        effectiveDateKey: getBangkokDateString(),
      });
    await releaseAnnualPmDay(user, {
      ...serviceScope,
      planId: annualPlanId,
      scheduleDateKey: date,
      scheduleIds,
      exclusions,
      leadUserId: leadUserId || undefined,
      collaboratorUserIds,
    });
  } catch (error) {
    redirect(
      url(scope, {
        view: validView(String(data.get("calendarView") ?? "")),
        month: date.slice(0, 7),
        date,
        annualPlanId,
        scheduleId,
        release: "annual",
        error: errorMessage(error),
      }),
    );
  }
  redirect(
    `/dashboardpm/annual/${encodeURIComponent(scheduleId)}?${new URLSearchParams(serviceScope)}`,
  );
}
