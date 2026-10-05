import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { canManagePmPlans, canViewPm } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  annualDateRange, datesInYearForWeekday, effectivePatternWeekIndex, monthlyPatternKey, normalizeAnnualPlanName, nthWeekdayOfMonth, rotationWeekIndex, PmAnnualBy,
  PmAnnualMonthlyWeek5Rule, PmAnnualMonthlyWeekMode,
  PmAnnualPlanStatus, PmAnnualScheduleMode, PmAnnualScheduleSource,
  PmAnnualScheduleStatus, requireDateInPlanYear, targetSlotKey,
  validateAnnualPlanChoice, validateAnnualYear, weeklyPatternKey,
} from "./pm-annual-types";

export type PmAnnualScope = { organizationId: string; plantId: string };
export type AnnualTarget = { assetSystemId?: string | null; zoneId?: string | null };
export type MonthlyPatternEntry = { weekNumber: number; dayOfWeek: number; displayOrder: number } & AnnualTarget;

function actorId(actor: PermissionUserContext) { if (!actor.id) throw new Error("Authenticated user is required"); return actor.id; }
function authorize(actor: PermissionUserContext, scope: PmAnnualScope, manage: boolean) {
  if (manage ? !canManagePmPlans(actor) : !canViewPm(actor)) throw new Error(manage ? "You cannot manage PM plans" : "You cannot view PM plans");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM plan scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) throw new Error("PM plan scope is outside your Site");
}
async function scopeExists(tx: Prisma.TransactionClient, scope: PmAnnualScope) {
  await tx.plant.findFirstOrThrow({ where: { id: scope.plantId, organizationId: scope.organizationId, active: true, organization: { active: true } }, select: { id: true } });
}
async function audit(tx: Prisma.TransactionClient, actor: PermissionUserContext, scope: PmAnnualScope, id: string, action: string, before: unknown, after: unknown) {
  await tx.auditEvent.create({ data: { actorId: actorId(actor), organizationId: scope.organizationId, plantId: scope.plantId, entityType: "PmAnnualPlan", entityId: id, action, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after) } });
}
function selectedTarget(plan: { pmBy: string; plantId: string }, target: AnnualTarget) {
  const id = plan.pmBy === PmAnnualBy.SYSTEM ? target.assetSystemId?.trim() : target.zoneId?.trim();
  if (!id) throw new Error(plan.pmBy === PmAnnualBy.SYSTEM ? "System is required" : "Zone / Area is required");
  return { id, data: plan.pmBy === PmAnnualBy.SYSTEM ? { assetSystemId: id, zoneId: null } : { assetSystemId: null, zoneId: id } };
}
async function verifyTarget(tx: Prisma.TransactionClient, plan: { pmBy: string; plantId: string }, target: AnnualTarget, allowInactive = false) {
  const value = selectedTarget(plan, target);
  const found = plan.pmBy === PmAnnualBy.SYSTEM
    ? await tx.assetSystem.findFirst({ where: { id: value.id, plantId: plan.plantId, ...(allowInactive ? {} : { active: true }) }, select: { id: true } })
    : await tx.zone.findFirst({ where: { id: value.id, plantId: plan.plantId, ...(allowInactive ? {} : { active: true }) }, select: { id: true } });
  if (!found) throw new Error("The selected target is inactive or outside this Site");
  return value;
}
async function getPlan(tx: Prisma.TransactionClient, scope: PmAnnualScope, planId: string) {
  return tx.pmAnnualPlan.findFirstOrThrow({ where: { id: planId, organizationId: scope.organizationId, plantId: scope.plantId } });
}
function editable(plan: { status: string }, scheduleDateKey?: string) {
  if (plan.status === PmAnnualPlanStatus.DRAFT) return;
  if (plan.status !== PmAnnualPlanStatus.ACTIVE) throw new Error("This Annual PM Plan is read-only");
  if (scheduleDateKey && scheduleDateKey < getBangkokDateString()) throw new Error("Past Active schedules must be retained and handled as an exception");
}

export async function listAnnualPmPlans(actor: PermissionUserContext, scope: PmAnnualScope, year?: number) {
  authorize(actor, scope, false);
  return db.pmAnnualPlan.findMany({ where: { organizationId: scope.organizationId, plantId: scope.plantId, ...(year ? { year } : {}) }, orderBy: [{ year: "desc" }, { status: "asc" }, { updatedAt: "desc" }] });
}
export async function getAnnualPmWorkspace(actor: PermissionUserContext, input: PmAnnualScope & { planId: string }) {
  authorize(actor, input, false);
  return db.pmAnnualPlan.findFirstOrThrow({ where: { id: input.planId, organizationId: input.organizationId, plantId: input.plantId }, include: { weeklyPatterns: true, monthlyWeeks: { orderBy: { weekNumber: "asc" } }, monthlyPatterns: { include: { assetSystem: true, zone: true }, orderBy: [{ weekNumber: "asc" }, { displayOrder: "asc" }] }, schedules: { where: { slotKey: { not: null } }, include: { assetSystem: true, zone: true }, orderBy: [{ scheduleDateKey: "asc" }, { createdAt: "asc" }] }, dayNotes: true } });
}
export async function listAnnualPmTargets(actor: PermissionUserContext, input: PmAnnualScope & { pmBy: string }) {
  authorize(actor, input, false);
  return input.pmBy === PmAnnualBy.SYSTEM
    ? db.assetSystem.findMany({ where: { plantId: input.plantId }, select: { id: true, code: true, nameTh: true, active: true }, orderBy: [{ sortOrder: "asc" }, { nameTh: "asc" }] })
    : db.zone.findMany({ where: { plantId: input.plantId }, select: { id: true, name: true, active: true }, orderBy: { name: "asc" } });
}
export async function countAnnualPmMainAssets(
  actor: PermissionUserContext,
  input: PmAnnualScope & { pmBy: string; targetIds: string[] },
): Promise<Record<string, number>> {
  authorize(actor, input, false);
  if (!input.targetIds.length) return {};
  const where = { plantId: input.plantId, registrationStatus: "ACTIVE", assetLevel: "MAIN_ASSET" };
  if (input.pmBy === PmAnnualBy.SYSTEM) {
    const rows = await db.asset.groupBy({
      by: ["systemId"],
      where: { ...where, systemId: { in: input.targetIds } },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.filter(row => row.systemId).map(row => [row.systemId!, row._count._all]));
  }
  if (input.pmBy === PmAnnualBy.ZONE) {
    const rows = await db.asset.groupBy({
      by: ["zoneId"],
      where: { ...where, zoneId: { in: input.targetIds } },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.filter(row => row.zoneId).map(row => [row.zoneId!, row._count._all]));
  }
  throw new Error("PM By must be System or Zone / Area");
}

export async function createAnnualPmPlan(actor: PermissionUserContext, input: PmAnnualScope & { name: string; year: number; pmBy: string; scheduleMode: string }) {
  authorize(actor, input, true);
  const currentYear = Number(getBangkokDateString().slice(0, 4));
  const year = validateAnnualYear(input.year, currentYear);
  const pmBy = validateAnnualPlanChoice(input.pmBy, PmAnnualBy, "PM By");
  const scheduleMode = validateAnnualPlanChoice(input.scheduleMode, PmAnnualScheduleMode, "Schedule Mode");
  return db.$transaction(async tx => {
    await scopeExists(tx, input);
    const plan = await tx.pmAnnualPlan.create({ data: { organizationId: input.organizationId, plantId: input.plantId, name: normalizeAnnualPlanName(input.name, year), year, pmBy, scheduleMode, createdById: actorId(actor) } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_PLAN_CREATED", null, plan);
    return plan;
  });
}
export async function addAnnualPmSchedule(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; scheduleDateKey: string; reason?: string } & AnnualTarget) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId); editable(plan, input.scheduleDateKey); requireDateInPlanYear(input.scheduleDateKey, plan.year);
    const target = await verifyTarget(tx, plan, input); const slotKey = targetSlotKey(plan.id, input.scheduleDateKey, plan.pmBy as PmAnnualBy, target.id);
    const isMonthly = plan.scheduleMode === PmAnnualScheduleMode.MONTHLY_PATTERN;
    const reason = input.reason?.trim() || "";
    if (isMonthly && plan.status === PmAnnualPlanStatus.ACTIVE && !reason) throw new Error("A reason is required when adding a Custom Assignment to an Active plan");
    if (isMonthly && await tx.pmAnnualSchedule.findUnique({ where: { slotKey }, select: { id: true } })) throw new Error("This target is already scheduled on this date");
    const row = isMonthly
      ? await tx.pmAnnualSchedule.create({ data: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: input.scheduleDateKey, ...target.data, source: PmAnnualScheduleSource.OVERRIDE, status: PmAnnualScheduleStatus.SCHEDULED, overrideAction: "ADD", slotKey, reason: reason || null, recordedById: actorId(actor) } })
      : await tx.pmAnnualSchedule.upsert({ where: { slotKey }, update: { status: PmAnnualScheduleStatus.SCHEDULED, source: PmAnnualScheduleSource.MANUAL, overrideAction: null, reason: null, recordedById: actorId(actor) }, create: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: input.scheduleDateKey, ...target.data, source: PmAnnualScheduleSource.MANUAL, status: PmAnnualScheduleStatus.SCHEDULED, slotKey, recordedById: actorId(actor) } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_SCHEDULE_ADDED", null, { scheduleId: row.id, scheduleDateKey: row.scheduleDateKey, targetId: target.id }); return row;
  });
}
export async function changeAnnualPmSchedule(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; scheduleId: string; reason: string } & AnnualTarget) {
  authorize(actor, input, true);
  const reason = input.reason.trim();
  if (!reason) throw new Error("Change reason is required");
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId);
    const original = await tx.pmAnnualSchedule.findFirstOrThrow({ where: { id: input.scheduleId, planId: plan.id, slotKey: { not: null } } });
    editable(plan, original.scheduleDateKey);
    if (original.status === PmAnnualScheduleStatus.RELEASED || original.releasedAt) throw new Error("Released schedules cannot be changed from PM Setup");
    const target = await verifyTarget(tx, plan, input);
    const currentTargetId = original.assetSystemId ?? original.zoneId;
    if (target.id === currentTargetId) throw new Error("Choose a different target");
    const replacementSlot = targetSlotKey(plan.id, original.scheduleDateKey, plan.pmBy as PmAnnualBy, target.id);
    if (await tx.pmAnnualSchedule.findUnique({ where: { slotKey: replacementSlot }, select: { id: true } })) throw new Error("The replacement target is already scheduled on this date");
    await tx.pmAnnualSchedule.update({ where: { id: original.id }, data: { status: PmAnnualScheduleStatus.MOVED, slotKey: null, reason } });
    const replacement = await tx.pmAnnualSchedule.create({ data: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: original.scheduleDateKey, ...target.data, source: PmAnnualScheduleSource.OVERRIDE, status: PmAnnualScheduleStatus.SCHEDULED, overrideAction: "CHANGE", originalScheduleId: original.id, slotKey: replacementSlot, reason, recordedById: actorId(actor) } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_SCHEDULE_CHANGED", original, replacement);
    return replacement;
  });
}
export async function cancelAnnualPmSchedule(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; scheduleId: string; reason: string }) {
  authorize(actor, input, true); const reason = input.reason.trim(); if (!reason) throw new Error("Cancellation reason is required");
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId); const original = await tx.pmAnnualSchedule.findFirstOrThrow({ where: { id: input.scheduleId, planId: plan.id, slotKey: { not: null } } }); editable(plan);
    if (original.status === PmAnnualScheduleStatus.RELEASED || original.releasedAt) throw new Error("Released schedules cannot be canceled from PM Setup");
    const activeSlot = original.slotKey!; await tx.pmAnnualSchedule.update({ where: { id: original.id }, data: { status: PmAnnualScheduleStatus.CANCELED, slotKey: null, reason } });
    const exception = await tx.pmAnnualSchedule.create({ data: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: original.scheduleDateKey, assetSystemId: original.assetSystemId, zoneId: original.zoneId, source: PmAnnualScheduleSource.OVERRIDE, status: PmAnnualScheduleStatus.CANCELED, overrideAction: "NO_PM", originalScheduleId: original.id, slotKey: activeSlot, reason, recordedById: actorId(actor) } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_SCHEDULE_CANCELED", original, exception); return exception;
  });
}
export async function cancelAnnualPmRange(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; startDateKey: string; endDateKey: string; reason: string; excludedScheduleIds?: string[] }) {
  authorize(actor, input, true); const reason = input.reason.trim(); if (!reason) throw new Error("Cancellation reason is required");
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId); editable(plan); const dates = annualDateRange(input.startDateKey, input.endDateKey, plan.year); const excluded = new Set(input.excludedScheduleIds ?? []);
    const rows = await tx.pmAnnualSchedule.findMany({ where: { planId: plan.id, scheduleDateKey: { in: dates }, slotKey: { not: null }, releasedAt: null, status: PmAnnualScheduleStatus.SCHEDULED } }); let count = 0;
    for (const row of rows) { if (excluded.has(row.id)) continue; const activeSlot = row.slotKey!; await tx.pmAnnualSchedule.update({ where: { id: row.id }, data: { status: PmAnnualScheduleStatus.CANCELED, slotKey: null, reason } }); await tx.pmAnnualSchedule.create({ data: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: row.scheduleDateKey, assetSystemId: row.assetSystemId, zoneId: row.zoneId, source: PmAnnualScheduleSource.OVERRIDE, status: PmAnnualScheduleStatus.CANCELED, overrideAction: "NO_PM", originalScheduleId: row.id, slotKey: activeSlot, reason, recordedById: actorId(actor) } }); count += 1; }
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_RANGE_CANCELED", null, { startDateKey: input.startDateKey, endDateKey: input.endDateKey, reason, count }); return { count };
  });
}
export async function saveAnnualWeeklyPattern(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; cycleWeeks: number; anchorDateKey?: string | null; entries: Array<{ dayOfWeek: number; weekIndex: number } & AnnualTarget> }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId);
    editable(plan);
    if (plan.scheduleMode !== PmAnnualScheduleMode.WEEKLY_PATTERN) throw new Error("This plan is not in Weekly Pattern mode");
    if (input.cycleWeeks !== 1 && input.cycleWeeks !== 2) throw new Error("Weekly Pattern cycle must be one or two weeks");
    const anchorDateKey = input.cycleWeeks === 2 ? input.anchorDateKey?.trim() || null : null;
    if (input.cycleWeeks === 2) rotationWeekIndex(`${plan.year}-01-01`, 2, anchorDateKey);
    const checked: Array<{ dayOfWeek: number; weekIndex: number; id: string; data: { assetSystemId: string | null; zoneId: string | null }; patternKey: string }> = [];
    const keys = new Set<string>();
    for (const entry of input.entries) {
      if (entry.weekIndex !== 1 && entry.weekIndex !== 2) throw new Error("Weekly Pattern week must be A or B");
      if (input.cycleWeeks === 1 && entry.weekIndex !== 1) throw new Error("Week B requires two-week rotation");
      const target = await verifyTarget(tx, plan, entry);
      const patternKey = weeklyPatternKey(plan.id, entry.dayOfWeek, plan.pmBy as PmAnnualBy, target.id, entry.weekIndex);
      if (keys.has(patternKey)) throw new Error("The same target is selected twice for this day and week");
      keys.add(patternKey);
      checked.push({ dayOfWeek: entry.dayOfWeek, weekIndex: entry.weekIndex, id: target.id, data: target.data, patternKey });
    }
    await tx.pmAnnualWeeklyPattern.deleteMany({ where: { planId: plan.id } });
    await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { patternCycleWeeks: input.cycleWeeks, rotationAnchorDateKey: anchorDateKey } });
    for (const entry of checked) await tx.pmAnnualWeeklyPattern.create({ data: { plantId: plan.plantId, planId: plan.id, dayOfWeek: entry.dayOfWeek, weekIndex: entry.weekIndex, ...entry.data, patternKey: entry.patternKey } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_PATTERN_SAVED", null, { entries: checked.length, cycleWeeks: input.cycleWeeks, anchorDateKey });
    return { entries: checked.length };
  });
}

export async function applyAnnualWeeklyPattern(actor: PermissionUserContext, input: PmAnnualScope & { planId: string }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId); editable(plan);
    if (plan.scheduleMode !== PmAnnualScheduleMode.WEEKLY_PATTERN) throw new Error("This plan is not in Weekly Pattern mode");
    const patterns = await tx.pmAnnualWeeklyPattern.findMany({ where: { planId: plan.id }, include: { assetSystem: { select: { active: true } }, zone: { select: { active: true } } } });
    if (patterns.some(pattern => pattern.assetSystem?.active === false || pattern.zone?.active === false)) throw new Error("Weekly Pattern contains an inactive target; replace or remove it before Apply Pattern");
    const alternateDays = new Set(patterns.filter(pattern => pattern.weekIndex === 2).map(pattern => pattern.dayOfWeek));
    const earliest = plan.status === PmAnnualPlanStatus.ACTIVE ? getBangkokDateString() : `${plan.year}-01-01`;
    const desired = new Map<string, { dateKey: string; assetSystemId: string | null; zoneId: string | null }>();
    for (const pattern of patterns) for (const dateKey of datesInYearForWeekday(plan.year, pattern.dayOfWeek)) {
      if (effectivePatternWeekIndex(dateKey, plan.patternCycleWeeks, plan.rotationAnchorDateKey, alternateDays) !== pattern.weekIndex) continue;
      if (dateKey < earliest) continue;
      const targetId = (pattern.assetSystemId ?? pattern.zoneId)!;
      desired.set(targetSlotKey(plan.id, dateKey, plan.pmBy as PmAnnualBy, targetId), { dateKey, assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId });
    }
    const removable = await tx.pmAnnualSchedule.findMany({ where: { planId: plan.id, source: PmAnnualScheduleSource.PATTERN, status: PmAnnualScheduleStatus.SCHEDULED, releasedAt: null, originalScheduleId: null, scheduleDateKey: { gte: earliest }, slotKey: { not: null } }, select: { id: true, slotKey: true } });
    const removeIds = removable.filter(row => !desired.has(row.slotKey!)).map(row => row.id);
    if (removeIds.length) await tx.pmAnnualSchedule.deleteMany({ where: { id: { in: removeIds } } });
    let added = 0;
    for (const [slotKey, item] of desired) {
      const existing = await tx.pmAnnualSchedule.findUnique({ where: { slotKey }, select: { id: true } });
      if (existing) continue;
      await tx.pmAnnualSchedule.create({ data: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: item.dateKey, assetSystemId: item.assetSystemId, zoneId: item.zoneId, source: PmAnnualScheduleSource.PATTERN, status: PmAnnualScheduleStatus.SCHEDULED, slotKey, recordedById: actorId(actor) } });
      added += 1;
    }
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_PATTERN_APPLIED", null, { added, removed: removeIds.length });
    return { added, removed: removeIds.length };
  });
}

function monthlyEffectiveStart(plan: { year: number; status: string }, requested?: string) {
  const today = getBangkokDateString();
  const fallback = plan.year === Number(today.slice(0, 4)) ? today : `${plan.year}-01-01`;
  const dateKey = requireDateInPlanYear(requested?.trim() || fallback, plan.year);
  if (dateKey < fallback) throw new Error("Effective Start Date must be today or a future date inside the Plan Year");
  return dateKey;
}

async function monthlyGenerationState(tx: Prisma.TransactionClient, plan: Awaited<ReturnType<typeof getPlan>>, effectiveDateKey: string) {
  const weeks = await tx.pmAnnualMonthlyWeek.findMany({ where: { planId: plan.id }, orderBy: { weekNumber: "asc" } });
  if (weeks.length !== 4 || weeks.some((week, index) => week.weekNumber !== index + 1)) throw new Error("Configure Week 1 through Week 4 before Generate Annual PM Plan");
  const patterns = await tx.pmAnnualMonthlyPattern.findMany({ where: { planId: plan.id }, include: { assetSystem: { select: { active: true } }, zone: { select: { active: true } } }, orderBy: [{ weekNumber: "asc" }, { displayOrder: "asc" }] });
  if (patterns.some(pattern => pattern.assetSystem?.active === false || pattern.zone?.active === false)) throw new Error("Monthly Pattern contains an inactive target; replace or remove it before Generate");
  for (const week of weeks) {
    const count = patterns.filter(pattern => pattern.weekNumber === week.weekNumber).length;
    if (week.mode === PmAnnualMonthlyWeekMode.ASSIGNMENTS && !count) throw new Error(`Week ${week.weekNumber} is Not Configured`);
    if (week.mode === PmAnnualMonthlyWeekMode.NO_PM && count) throw new Error(`Week ${week.weekNumber} cannot contain Assignments while marked No PM`);
  }
  const desired = new Map<string, { dateKey: string; assetSystemId: string | null; zoneId: string | null }>();
  for (let month = 1; month <= 12; month += 1) {
    for (const pattern of patterns) {
      const dateKey = nthWeekdayOfMonth(plan.year, month, pattern.dayOfWeek, pattern.weekNumber);
      if (!dateKey || dateKey < effectiveDateKey) continue;
      const targetId = (pattern.assetSystemId ?? pattern.zoneId)!;
      desired.set(targetSlotKey(plan.id, dateKey, plan.pmBy as PmAnnualBy, targetId), { dateKey, assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId });
    }
    if (plan.monthlyWeek5Rule === PmAnnualMonthlyWeek5Rule.REPEAT_WEEK_1) {
      for (const pattern of patterns.filter(item => item.weekNumber === 1)) {
        const dateKey = nthWeekdayOfMonth(plan.year, month, pattern.dayOfWeek, 5);
        if (!dateKey || dateKey < effectiveDateKey) continue;
        const targetId = (pattern.assetSystemId ?? pattern.zoneId)!;
        desired.set(targetSlotKey(plan.id, dateKey, plan.pmBy as PmAnnualBy, targetId), { dateKey, assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId });
      }
    }
  }
  const active = await tx.pmAnnualSchedule.findMany({ where: { planId: plan.id, slotKey: { not: null } }, select: { id: true, slotKey: true } });
  const activeKeys = new Set(active.map(row => row.slotKey!));
  const removable = await tx.pmAnnualSchedule.findMany({ where: { planId: plan.id, source: PmAnnualScheduleSource.PATTERN, status: PmAnnualScheduleStatus.SCHEDULED, releasedAt: null, originalScheduleId: null, scheduleDateKey: { gte: effectiveDateKey }, slotKey: { not: null } }, select: { id: true, slotKey: true } });
  const removeIds = removable.filter(row => !desired.has(row.slotKey!)).map(row => row.id);
  const additions = [...desired.entries()].filter(([slotKey]) => !activeKeys.has(slotKey));
  return { desired, additions, removeIds, kept: desired.size - additions.length, effectiveDateKey };
}

export async function saveAnnualMonthlyPattern(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; week5Rule: string; reason?: string; weeks: Array<{ weekNumber: number; mode: string }>; entries: MonthlyPatternEntry[] }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId); editable(plan);
    if (plan.scheduleMode !== PmAnnualScheduleMode.MONTHLY_PATTERN) throw new Error("This plan is not in Monthly Pattern mode");
    const reason = input.reason?.trim() || "";
    if (plan.status === PmAnnualPlanStatus.ACTIVE && !reason) throw new Error("A reason is required when changing an Active Monthly Pattern");
    const week5Rule = validateAnnualPlanChoice(input.week5Rule, PmAnnualMonthlyWeek5Rule, "Week 5 rule");
    const weekMap = new Map<number, string>();
    for (const week of input.weeks) {
      if (!Number.isInteger(week.weekNumber) || week.weekNumber < 1 || week.weekNumber > 4 || weekMap.has(week.weekNumber)) throw new Error("Monthly Pattern must define Week 1 through Week 4 exactly once");
      weekMap.set(week.weekNumber, validateAnnualPlanChoice(week.mode, PmAnnualMonthlyWeekMode, `Week ${week.weekNumber} mode`));
    }
    if (weekMap.size !== 4) throw new Error("Monthly Pattern must define Week 1 through Week 4");
    const checked: Array<MonthlyPatternEntry & { data: { assetSystemId: string | null; zoneId: string | null }; patternKey: string }> = [];
    const keys = new Set<string>();
    for (const entry of input.entries) {
      const mode = weekMap.get(entry.weekNumber);
      if (mode === PmAnnualMonthlyWeekMode.NO_PM) throw new Error(`Week ${entry.weekNumber} is marked No PM`);
      if (!Number.isInteger(entry.displayOrder) || entry.displayOrder < 0) throw new Error("Monthly Pattern display order is invalid");
      const target = await verifyTarget(tx, plan, entry);
      const patternKey = monthlyPatternKey(plan.id, entry.weekNumber, entry.dayOfWeek, plan.pmBy as PmAnnualBy, target.id);
      if (keys.has(patternKey)) throw new Error("The same target is selected twice for this Week and weekday");
      keys.add(patternKey);
      checked.push({ ...entry, ...target.data, data: target.data, patternKey });
    }
    for (const [weekNumber, mode] of weekMap) if (mode === PmAnnualMonthlyWeekMode.ASSIGNMENTS && !checked.some(entry => entry.weekNumber === weekNumber)) throw new Error(`Week ${weekNumber} is Not Configured`);
    const before = { version: plan.monthlyPatternVersion, week5Rule: plan.monthlyWeek5Rule };
    await tx.pmAnnualMonthlyPattern.deleteMany({ where: { planId: plan.id } });
    await tx.pmAnnualMonthlyWeek.deleteMany({ where: { planId: plan.id } });
    for (const [weekNumber, mode] of [...weekMap.entries()].sort(([a], [b]) => a - b)) await tx.pmAnnualMonthlyWeek.create({ data: { plantId: plan.plantId, planId: plan.id, weekNumber, mode } });
    for (const entry of checked) await tx.pmAnnualMonthlyPattern.create({ data: { plantId: plan.plantId, planId: plan.id, weekNumber: entry.weekNumber, dayOfWeek: entry.dayOfWeek, displayOrder: entry.displayOrder, ...entry.data, patternKey: entry.patternKey } });
    const updated = await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { monthlyWeek5Rule: week5Rule, monthlyPatternVersion: { increment: 1 }, updatedById: actorId(actor) } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_MONTHLY_PATTERN_SAVED", before, { version: updated.monthlyPatternVersion, week5Rule, entries: checked.length, reason: reason || null });
    return { entries: checked.length, version: updated.monthlyPatternVersion };
  });
}

export async function previewAnnualMonthlyPattern(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; effectiveDateKey?: string }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId);
    if (plan.scheduleMode !== PmAnnualScheduleMode.MONTHLY_PATTERN) throw new Error("This plan is not in Monthly Pattern mode");
    const state = await monthlyGenerationState(tx, plan, monthlyEffectiveStart(plan, input.effectiveDateKey));
    return { added: state.additions.length, removed: state.removeIds.length, kept: state.kept, desired: state.desired.size, effectiveDateKey: state.effectiveDateKey };
  });
}

export async function applyAnnualMonthlyPattern(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; effectiveDateKey?: string; reason?: string }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId); editable(plan);
    if (plan.scheduleMode !== PmAnnualScheduleMode.MONTHLY_PATTERN) throw new Error("This plan is not in Monthly Pattern mode");
    const reason = input.reason?.trim() || "";
    if (plan.status === PmAnnualPlanStatus.ACTIVE && !reason) throw new Error("A reason is required when regenerating an Active Monthly Pattern");
    const state = await monthlyGenerationState(tx, plan, monthlyEffectiveStart(plan, input.effectiveDateKey));
    if (state.removeIds.length) await tx.pmAnnualSchedule.deleteMany({ where: { id: { in: state.removeIds } } });
    for (const [slotKey, item] of state.additions) await tx.pmAnnualSchedule.create({ data: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: item.dateKey, assetSystemId: item.assetSystemId, zoneId: item.zoneId, source: PmAnnualScheduleSource.PATTERN, status: PmAnnualScheduleStatus.SCHEDULED, slotKey, recordedById: actorId(actor) } });
    await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { effectiveDateKey: state.effectiveDateKey, monthlyGeneratedVersion: plan.monthlyPatternVersion, updatedById: actorId(actor) } });
    const result = { added: state.additions.length, removed: state.removeIds.length, kept: state.kept, desired: state.desired.size, effectiveDateKey: state.effectiveDateKey };
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_MONTHLY_PATTERN_GENERATED", null, { ...result, version: plan.monthlyPatternVersion, reason: reason || null });
    return result;
  });
}

export async function updateAnnualPmPlanName(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; name: string }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId);
    if (![PmAnnualPlanStatus.DRAFT, PmAnnualPlanStatus.ACTIVE].includes(plan.status as never)) throw new Error("This plan is read-only");
    const name = normalizeAnnualPlanName(input.name, plan.year);
    const updated = await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { name } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_PLAN_RENAMED", { name: plan.name }, { name });
    return updated;
  });
}

export async function resetDraftAnnualPmPlanSettings(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; pmBy: string; scheduleMode: string; confirmedReset: boolean }) {
  authorize(actor, input, true);
  if (!input.confirmedReset) throw new Error("Confirm reset before changing PM By or Schedule Mode");
  const pmBy = validateAnnualPlanChoice(input.pmBy, PmAnnualBy, "PM By");
  const scheduleMode = validateAnnualPlanChoice(input.scheduleMode, PmAnnualScheduleMode, "Schedule Mode");
  return db.$transaction(async tx => {
    const plan = await getPlan(tx, input, input.planId);
    if (plan.status !== PmAnnualPlanStatus.DRAFT) throw new Error("Only a Draft plan can change PM By or Schedule Mode");
    const before = { pmBy: plan.pmBy, scheduleMode: plan.scheduleMode };
    if (before.pmBy === pmBy && before.scheduleMode === scheduleMode) return plan;
    await tx.pmAnnualDayNote.deleteMany({ where: { planId: plan.id } });
    await tx.pmAnnualSchedule.deleteMany({ where: { planId: plan.id } });
    await tx.pmAnnualWeeklyPattern.deleteMany({ where: { planId: plan.id } });
    await tx.pmAnnualMonthlyPattern.deleteMany({ where: { planId: plan.id } });
    await tx.pmAnnualMonthlyWeek.deleteMany({ where: { planId: plan.id } });
    const updated = await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { pmBy, scheduleMode, monthlyWeek5Rule: PmAnnualMonthlyWeek5Rule.NO_PM, monthlyPatternVersion: 0, monthlyGeneratedVersion: 0, updatedById: actorId(actor) } });
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_DRAFT_SETTINGS_RESET", before, { pmBy, scheduleMode });
    return updated;
  });
}
export async function saveAnnualPmDayNote(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; scheduleDateKey: string; note: string }) {
  authorize(actor, input, true); return db.$transaction(async tx => { const plan = await getPlan(tx, input, input.planId); editable(plan); requireDateInPlanYear(input.scheduleDateKey, plan.year); const note = input.note.trim(); if (!note) { await tx.pmAnnualDayNote.deleteMany({ where: { planId: plan.id, scheduleDateKey: input.scheduleDateKey } }); return null; } return tx.pmAnnualDayNote.upsert({ where: { planId_scheduleDateKey: { planId: plan.id, scheduleDateKey: input.scheduleDateKey } }, update: { note, updatedById: actorId(actor) }, create: { plantId: plan.plantId, planId: plan.id, scheduleDateKey: input.scheduleDateKey, note, updatedById: actorId(actor) } }); });
}
export async function activateAnnualPmPlan(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; effectiveDateKey?: string }) {
  authorize(actor, input, true); return db.$transaction(async tx => { const plan = await getPlan(tx, input, input.planId); if (plan.status !== PmAnnualPlanStatus.DRAFT) throw new Error("Only a Draft plan can be activated"); if (plan.scheduleMode === PmAnnualScheduleMode.MONTHLY_PATTERN && (plan.monthlyPatternVersion === 0 || plan.monthlyGeneratedVersion !== plan.monthlyPatternVersion)) throw new Error("Regeneration Required before activating this Monthly Pattern plan"); const count = await tx.pmAnnualSchedule.count({ where: { planId: plan.id, slotKey: { not: null }, status: PmAnnualScheduleStatus.SCHEDULED } }); if (!count) throw new Error("Add at least one PM schedule before activation"); const scheduledTargets = await tx.pmAnnualSchedule.findMany({ where: { planId: plan.id, slotKey: { not: null }, status: PmAnnualScheduleStatus.SCHEDULED }, include: { assetSystem: { select: { active: true } }, zone: { select: { active: true } } } }); if (scheduledTargets.some(row => row.assetSystem?.active === false || row.zone?.active === false)) throw new Error("The plan contains an inactive target; keep, replace, or cancel it before activation"); const existing = await tx.pmAnnualPlan.findFirst({ where: { plantId: plan.plantId, year: plan.year, status: PmAnnualPlanStatus.ACTIVE } }); const now = new Date(); const today = getBangkokDateString(now); const effectiveDateKey = plan.scheduleMode === PmAnnualScheduleMode.MONTHLY_PATTERN && plan.effectiveDateKey ? requireDateInPlanYear(plan.effectiveDateKey, plan.year) : input.effectiveDateKey ? requireDateInPlanYear(input.effectiveDateKey, plan.year) : (plan.effectiveDateKey ?? (plan.year === Number(today.slice(0, 4)) ? today : `${plan.year}-01-01`)); if (effectiveDateKey < today) throw new Error("Effective date must be today or a future date"); if (existing) { const releasedConflict = await tx.pmAnnualSchedule.count({ where: { planId: existing.id, scheduleDateKey: { gte: effectiveDateKey }, releasedAt: { not: null } } }); if (releasedConflict) throw new Error("The active plan has released work on or after the effective date"); await tx.pmAnnualPlan.update({ where: { id: existing.id }, data: { status: PmAnnualPlanStatus.SUPERSEDED, activeKey: null, supersededAt: now, supersededById: actorId(actor), replacementPlanId: plan.id } }); }
    const active = await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { status: PmAnnualPlanStatus.ACTIVE, activeKey: `${plan.plantId}:${plan.year}`, effectiveDateKey, activatedAt: now, activatedById: actorId(actor) } }); await audit(tx, actor, input, plan.id, existing ? "ANNUAL_PM_PLAN_REPLACED" : "ANNUAL_PM_PLAN_ACTIVATED", existing, active); return active; });
}
export async function cancelAnnualPmPlan(actor: PermissionUserContext, input: PmAnnualScope & { planId: string; reason: string }) { authorize(actor, input, true); const reason = input.reason.trim(); if (!reason) throw new Error("Cancellation reason is required"); return db.$transaction(async tx => { const plan = await getPlan(tx, input, input.planId); if (![PmAnnualPlanStatus.DRAFT, PmAnnualPlanStatus.ACTIVE].includes(plan.status as never)) throw new Error("This plan cannot be canceled"); const updated = await tx.pmAnnualPlan.update({ where: { id: plan.id }, data: { status: PmAnnualPlanStatus.CANCELED, activeKey: null, canceledAt: new Date(), canceledById: actorId(actor), cancellationReason: reason } }); await audit(tx, actor, input, plan.id, "ANNUAL_PM_PLAN_CANCELED", plan, updated); return updated; }); }
export async function deleteDraftAnnualPmPlan(actor: PermissionUserContext, input: PmAnnualScope & { planId: string }) { authorize(actor, input, true); return db.$transaction(async tx => { const plan = await getPlan(tx, input, input.planId); if (plan.status !== PmAnnualPlanStatus.DRAFT) throw new Error("Only a Draft plan can be deleted"); await audit(tx, actor, input, plan.id, "ANNUAL_PM_DRAFT_DELETED", plan, null); await tx.pmAnnualPlan.delete({ where: { id: plan.id } }); return { id: plan.id }; }); }
