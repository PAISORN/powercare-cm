import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { canExecutePmWork, canManagePmPlans, canViewPm } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import { datesInYearForWeekday, effectivePatternWeekIndex, monthlyPatternKey, nthWeekdayOfMonth, weeklyPatternKey, PmAnnualBy, PmAnnualMonthlyWeek5Rule, PmAnnualPlanStatus, PmAnnualScheduleMode, PmAnnualScheduleSource, PmAnnualScheduleStatus, requireDateInPlanYear, targetSlotKey } from "./pm-annual-types";
import { reservePmPlanSequence } from "./pm-sequence-service";
import { PmAssigneeRole } from "./pm-types";

export const PmSiteCalendarType = { PUBLIC_HOLIDAY: "PUBLIC_HOLIDAY", SITE_HOLIDAY: "SITE_HOLIDAY", SHUTDOWN: "SHUTDOWN" } as const;
type Scope = { organizationId: string; plantId: string };
type Exclusion = { assetId: string; reason: string };

function actorId(actor: PermissionUserContext) { if (!actor.id) throw new Error("Authenticated user is required"); return actor.id; }
function authorize(actor: PermissionUserContext, scope: Scope, manage: boolean) {
  if (manage ? !canManagePmPlans(actor) : !canViewPm(actor)) throw new Error(manage ? "You cannot manage PM plans" : "You cannot view PM plans");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) throw new Error("PM scope is outside your Site");
}
function authorizeRelease(actor: PermissionUserContext, scope: Scope) {
  if (!canManagePmPlans(actor) && !canExecutePmWork(actor)) throw new Error("You cannot start PM work");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId) throw new Error("PM scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId) throw new Error("PM scope is outside your Site");
}
function validDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value) throw new Error("A valid calendar date is required"); return value; }
function addDays(dateKey: string, days: number) { const date = new Date(`${dateKey}T00:00:00Z`); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
function cleanPositive(value: number, label: string, maximum: number) { if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`${label} must be between 1 and ${maximum}`); return value; }
async function siteSettings(tx: Prisma.TransactionClient | typeof db, plantId: string) { return tx.pmAnnualSiteSetting.upsert({ where: { plantId }, create: { plantId }, update: {} }); }
async function audit(tx: Prisma.TransactionClient, actor: PermissionUserContext, scope: Scope, entityId: string, action: string, after: unknown) { await tx.auditEvent.create({ data: { actorId: actorId(actor), organizationId: scope.organizationId, plantId: scope.plantId, entityType: "PmAnnualPlan", entityId, action, afterJson: JSON.stringify(after) } }); }

export async function getAnnualPmSiteSettings(actor: PermissionUserContext, scope: Scope) { authorize(actor, scope, false); return siteSettings(db, scope.plantId); }
export async function updateAnnualPmSiteSettings(actor: PermissionUserContext, input: Scope & { releaseWindowDays: number; workloadWarningThreshold: number }) {
  authorize(actor, input, true); const releaseWindowDays=cleanPositive(input.releaseWindowDays,"Release Window",365); const workloadWarningThreshold=cleanPositive(input.workloadWarningThreshold,"Workload threshold",10000);
  return db.$transaction(async tx => { const updated=await tx.pmAnnualSiteSetting.upsert({where:{plantId:input.plantId},create:{plantId:input.plantId,releaseWindowDays,workloadWarningThreshold},update:{releaseWindowDays,workloadWarningThreshold}}); await audit(tx,actor,input,input.plantId,"ANNUAL_PM_SITE_SETTINGS_UPDATED",updated); return updated; });
}
export async function listPmSiteCalendarDays(actor: PermissionUserContext, input: Scope & { startDateKey: string; endDateKey: string }) { authorize(actor,input,false); return db.pmSiteCalendarDay.findMany({where:{plantId:input.plantId,dateKey:{gte:validDate(input.startDateKey),lte:validDate(input.endDateKey)}},orderBy:[{dateKey:"asc"},{type:"asc"}]}); }
export async function savePmSiteCalendarDay(actor: PermissionUserContext, input: Scope & { dateKey:string; type:string; title:string; note?:string }) {
  authorize(actor,input,true); const dateKey=validDate(input.dateKey); if(!Object.values(PmSiteCalendarType).includes(input.type as never)) throw new Error("Calendar type is invalid"); const title=input.title.trim(); if(!title) throw new Error("Calendar title is required");
  return db.$transaction(async tx=>{const row=await tx.pmSiteCalendarDay.upsert({where:{plantId_dateKey_type:{plantId:input.plantId,dateKey,type:input.type}},create:{plantId:input.plantId,dateKey,type:input.type,title,note:input.note?.trim()||null,createdById:actorId(actor)},update:{title,note:input.note?.trim()||null,createdById:actorId(actor)}});await audit(tx,actor,input,row.id,"PM_SITE_CALENDAR_DAY_SAVED",row);return row;});
}
export async function deletePmSiteCalendarDay(actor: PermissionUserContext, input: Scope & { id:string }) { authorize(actor,input,true); return db.$transaction(async tx=>{const row=await tx.pmSiteCalendarDay.findFirstOrThrow({where:{id:input.id,plantId:input.plantId}});await tx.pmSiteCalendarDay.delete({where:{id:row.id}});await audit(tx,actor,input,row.id,"PM_SITE_CALENDAR_DAY_DELETED",row);return row;}); }

export async function moveAnnualPmScheduleDate(actor: PermissionUserContext,input:Scope&{planId:string;scheduleId:string;destinationDateKey:string;reason:string}){
  authorize(actor,input,true);const reason=input.reason.trim();if(!reason)throw new Error("Move reason is required");
  return db.$transaction(async tx=>{const plan=await tx.pmAnnualPlan.findFirstOrThrow({where:{id:input.planId,organizationId:input.organizationId,plantId:input.plantId}});if(![PmAnnualPlanStatus.DRAFT,PmAnnualPlanStatus.ACTIVE].includes(plan.status as never))throw new Error("This Annual PM Plan is read-only");const destination=requireDateInPlanYear(input.destinationDateKey,plan.year);if(plan.status===PmAnnualPlanStatus.ACTIVE&&destination<getBangkokDateString())throw new Error("An Active schedule can move only to today or a future date");const original=await tx.pmAnnualSchedule.findFirstOrThrow({where:{id:input.scheduleId,planId:plan.id,slotKey:{not:null},status:PmAnnualScheduleStatus.SCHEDULED,releasedAt:null}});const targetId=(original.assetSystemId??original.zoneId)!;const slotKey=targetSlotKey(plan.id,destination,plan.pmBy as never,targetId);if(await tx.pmAnnualSchedule.findUnique({where:{slotKey},select:{id:true}}))throw new Error("This target is already scheduled on the destination date");await tx.pmAnnualSchedule.update({where:{id:original.id},data:{status:PmAnnualScheduleStatus.MOVED,slotKey:null,reason}});const moved=await tx.pmAnnualSchedule.create({data:{plantId:plan.plantId,planId:plan.id,scheduleDateKey:destination,assetSystemId:original.assetSystemId,zoneId:original.zoneId,source:PmAnnualScheduleSource.OVERRIDE,status:PmAnnualScheduleStatus.SCHEDULED,overrideAction:"MOVE",originalScheduleId:original.id,slotKey,reason,recordedById:actorId(actor)}});await audit(tx,actor,input,plan.id,"ANNUAL_PM_SCHEDULE_MOVED",{from:original.scheduleDateKey,to:destination,originalScheduleId:original.id,scheduleId:moved.id,reason});return moved;});
}

async function selectedSchedules(tx:Prisma.TransactionClient, input:Scope&{planId:string;scheduleDateKey:string;scheduleIds?:string[]}, planStatuses:string[]=[PmAnnualPlanStatus.ACTIVE]) { const plan=await tx.pmAnnualPlan.findFirstOrThrow({where:{id:input.planId,organizationId:input.organizationId,plantId:input.plantId,status:{in:planStatuses}}});const date=validDate(input.scheduleDateKey);const rows=await tx.pmAnnualSchedule.findMany({where:{planId:plan.id,scheduleDateKey:date,status:PmAnnualScheduleStatus.SCHEDULED,releasedAt:null,slotKey:{not:null},...(input.scheduleIds?.length?{id:{in:input.scheduleIds}}:{})},include:{assetSystem:true,zone:true},orderBy:{createdAt:"asc"}});if(!rows.length)throw new Error("No unreleased Annual PM schedules were selected");if(input.scheduleIds?.length&&rows.length!==new Set(input.scheduleIds).size)throw new Error("Some selected schedules are unavailable or already released");return{plan,date,rows}; }
async function assetsForSchedules(tx:Prisma.TransactionClient, plantId:string, rows:Array<{id:string;assetSystemId:string|null;zoneId:string|null}>) { const systems=rows.flatMap(r=>r.assetSystemId?[r.assetSystemId]:[]);const zones=rows.flatMap(r=>r.zoneId?[r.zoneId]:[]);const assets=await tx.asset.findMany({where:{plantId,registrationStatus:"ACTIVE",assetLevel:{in:["MAIN_ASSET","SUB_ASSET","PART_ASSET"]},OR:[...(systems.length?[{systemId:{in:systems}}]:[]),...(zones.length?[{zoneId:{in:zones}}]:[])]},select:{id:true,code:true,nameTh:true,assetLevel:true,systemId:true,zoneId:true,operatingStatus:true},orderBy:[{code:"asc"},{nameTh:"asc"}]});return assets.map(asset=>({...asset,scheduleIds:rows.filter(r=>(r.assetSystemId&&r.assetSystemId===asset.systemId)||(r.zoneId&&r.zoneId===asset.zoneId)).map(r=>r.id)})); }
function ensureReleaseWindow(date:string,days:number){const today=getBangkokDateString();if(date>addDays(today,days))throw new Error(`This schedule is outside the ${days}-day PM Release Window`);}
export async function previewAnnualPmRelease(actor:PermissionUserContext,input:Scope&{planId:string;scheduleDateKey:string;scheduleIds?:string[]}){authorize(actor,input,false);return db.$transaction(async tx=>{const settings=await siteSettings(tx,input.plantId);const selected=await selectedSchedules(tx,input,[PmAnnualPlanStatus.ACTIVE,PmAnnualPlanStatus.DRAFT]);ensureReleaseWindow(selected.date,settings.releaseWindowDays);const assets=await assetsForSchedules(tx,input.plantId,selected.rows);return{plan:selected.plan,scheduleDateKey:selected.date,schedules:selected.rows,assets,warningAssets:assets.filter(a=>a.operatingStatus!=="IN_SERVICE"),settings,workload:{count:assets.length,threshold:settings.workloadWarningThreshold,warning:assets.length>settings.workloadWarningThreshold}};});}

export async function releaseAnnualPmDay(actor:PermissionUserContext,input:Scope&{planId:string;scheduleDateKey:string;scheduleIds:string[];exclusions?:Exclusion[];leadUserId?:string;collaboratorUserIds?:string[];now?:Date}){
 authorizeRelease(actor,input);if(!input.scheduleIds.length)throw new Error("Select at least one Annual PM target");const exclusions=new Map<string,string>();for(const item of input.exclusions??[]){const reason=item.reason.trim();if(!reason)throw new Error("Every excluded Asset requires a reason");exclusions.set(item.assetId,reason);}const now=input.now??new Date();const submittedCollaboratorUserIds=[...new Set((input.collaboratorUserIds??[]).map(id=>id.trim()).filter(Boolean))];const leadUserId=input.leadUserId?.trim()||submittedCollaboratorUserIds.shift()||"";const collaboratorUserIds=submittedCollaboratorUserIds.filter(id=>id!==leadUserId);const teamIds=leadUserId?[leadUserId,...collaboratorUserIds]:[];
 return db.$transaction(async tx=>{const settings=await siteSettings(tx,input.plantId);const selected=await selectedSchedules(tx,input);ensureReleaseWindow(selected.date,settings.releaseWindowDays);const plant=await tx.plant.findFirstOrThrow({where:{id:input.plantId,organizationId:input.organizationId,active:true},select:{id:true,code:true}});const resolved=await assetsForSchedules(tx,input.plantId,selected.rows);for(const id of exclusions.keys())if(!resolved.some(a=>a.id===id))throw new Error("An excluded Asset is outside the selected targets");const included=resolved.filter(a=>!exclusions.has(a.id));if(!included.length)throw new Error("Release must include at least one eligible Asset");let pmPlan=await tx.pmPlan.findFirst({where:{organizationId:input.organizationId,plantId:input.plantId,plannedDateKey:selected.date,status:{not:"CANCELED"}},orderBy:{createdAt:"asc"}});if(pmPlan?.status==="DRAFT")throw new Error("A legacy Draft PM Plan already exists on this date; confirm or remove it before Annual release");let workSequence=pmPlan?.lastWorkSequence??0;if(!pmPlan){const creationDateKey=getBangkokDateString(now);const reserved=await reservePmPlanSequence(tx,plant.code,creationDateKey);pmPlan=await tx.pmPlan.create({data:{organizationId:input.organizationId,plantId:input.plantId,plannedDateKey:selected.date,status:"CONFIRMED",number:reserved.planNumber,creationDateKey,confirmedAt:now,confirmedById:actorId(actor)},});}
 const batch=await tx.pmAnnualReleaseBatch.upsert({where:{pmPlanId:pmPlan.id},create:{organizationId:input.organizationId,plantId:input.plantId,planId:selected.plan.id,scheduleDateKey:selected.date,pmPlanId:pmPlan.id,releasedById:actorId(actor),releasedAt:now},update:{releasedById:actorId(actor),releasedAt:now}});if(teamIds.length){const [users,rolePermissionOverrides]=await Promise.all([tx.user.findMany({where:{id:{in:teamIds},organizationId:input.organizationId,plantId:input.plantId,active:true},include:{siteAdminPermissions:true,userPermissionOverrides:true}}),tx.rolePermissionOverride.findMany({where:{OR:[{scopeKey:"SYSTEM"},{organizationId:input.organizationId}]}})]);if(users.length!==teamIds.length||users.some(user=>!canExecutePmWork({...user,rolePermissionOverrides})))throw new Error("Every PM team member must be active, in the same Site, and have PM execution permission");}const existingWorks=await tx.pmWork.findMany({where:{pmPlanId:pmPlan.id},select:{id:true,assetId:true,assignees:{select:{userId:true,role:true}}}});const byAsset=new Map(existingWorks.map(w=>[w.assetId,w]));for(const asset of included){let work=byAsset.get(asset.id);if(!work){workSequence+=1;const base=pmPlan.number!.replace(/^PMP-/,"PM-");work=await tx.pmWork.create({data:{plantId:input.plantId,pmPlanId:pmPlan.id,assetId:asset.id,assetCodeSnapshot:asset.code,assetNameSnapshot:asset.nameTh,number:`${base}-${String(workSequence).padStart(3,"0")}`,status:"PLANNED"},select:{id:true,assetId:true,assignees:{select:{userId:true,role:true}}}});byAsset.set(asset.id,work);}if(teamIds.length){const existingLead=work.assignees.some(item=>item.role===PmAssigneeRole.LEAD);for(const userId of teamIds){const role=userId===leadUserId&&!existingLead?PmAssigneeRole.LEAD:PmAssigneeRole.COLLABORATOR;await tx.pmWorkAssignee.upsert({where:{pmWorkId_userId:{pmWorkId:work.id,userId}},create:{pmWorkId:work.id,userId,role,assignedAt:now,assignedById:actorId(actor)},update:userId===leadUserId&&!existingLead?{role:PmAssigneeRole.LEAD}:{}});}}for(const scheduleId of asset.scheduleIds)await tx.pmAnnualWorkSource.upsert({where:{pmWorkId_scheduleId:{pmWorkId:work.id,scheduleId}},create:{pmWorkId:work.id,scheduleId},update:{}});}
 for(const row of selected.rows){await tx.pmAnnualReleaseSchedule.upsert({where:{scheduleId:row.id},create:{batchId:batch.id,scheduleId:row.id},update:{batchId:batch.id}});await tx.pmAnnualSchedule.update({where:{id:row.id},data:{status:PmAnnualScheduleStatus.RELEASED,releasedAt:now}});}for(const [assetId,reason] of exclusions)await tx.pmAnnualReleaseExclusion.upsert({where:{batchId_assetId:{batchId:batch.id,assetId}},create:{batchId:batch.id,assetId,reason},update:{reason}});await tx.pmPlan.update({where:{id:pmPlan.id},data:{lastWorkSequence:workSequence}});await audit(tx,actor,input,selected.plan.id,"ANNUAL_PM_DAY_RELEASED",{batchId:batch.id,pmPlanId:pmPlan.id,scheduleIds:selected.rows.map(r=>r.id),workCount:included.length,excludedCount:exclusions.size,teamIds,workloadWarning:included.length>settings.workloadWarningThreshold});return{batchId:batch.id,pmPlanId:pmPlan.id,workCount:included.length,excludedCount:exclusions.size,teamSize:teamIds.length,workloadWarning:included.length>settings.workloadWarningThreshold};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function copyPreviousAnnualPmPlan(actor: PermissionUserContext, input: Scope & { sourcePlanId: string; targetYear: number; name?: string }) {
  authorize(actor, input, true);
  return db.$transaction(async tx => {
    const source = await tx.pmAnnualPlan.findFirstOrThrow({ where: { id: input.sourcePlanId, organizationId: input.organizationId, plantId: input.plantId }, include: { weeklyPatterns: true, monthlyWeeks: true, monthlyPatterns: true, schedules: { where: { originalScheduleId: null } } } });
    if (input.targetYear !== source.year + 1) throw new Error("The target must be the next calendar year");
    const plan = await tx.pmAnnualPlan.create({ data: {
      organizationId: input.organizationId, plantId: input.plantId,
      name: input.name?.trim() || `${source.name} ${input.targetYear}`,
      year: input.targetYear, pmBy: source.pmBy, scheduleMode: source.scheduleMode,
      patternCycleWeeks: source.patternCycleWeeks, rotationAnchorDateKey: source.rotationAnchorDateKey,
      monthlyWeek5Rule: source.monthlyWeek5Rule,
      monthlyPatternVersion: source.scheduleMode === PmAnnualScheduleMode.MONTHLY_PATTERN ? 1 : 0,
      monthlyGeneratedVersion: source.scheduleMode === PmAnnualScheduleMode.MONTHLY_PATTERN ? 1 : 0,
      createdById: actorId(actor), updatedById: actorId(actor),
    } });
    for (const pattern of source.weeklyPatterns) await tx.pmAnnualWeeklyPattern.create({ data: {
      plantId: input.plantId, planId: plan.id, dayOfWeek: pattern.dayOfWeek, weekIndex: pattern.weekIndex,
      assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId,
      patternKey: weeklyPatternKey(plan.id, pattern.dayOfWeek, source.pmBy as PmAnnualBy, (pattern.assetSystemId ?? pattern.zoneId)!, pattern.weekIndex),
    } });
    for (const week of source.monthlyWeeks ?? []) await tx.pmAnnualMonthlyWeek.create({ data: { plantId: input.plantId, planId: plan.id, weekNumber: week.weekNumber, mode: week.mode } });
    for (const pattern of source.monthlyPatterns ?? []) await tx.pmAnnualMonthlyPattern.create({ data: {
      plantId: input.plantId, planId: plan.id, weekNumber: pattern.weekNumber, dayOfWeek: pattern.dayOfWeek, displayOrder: pattern.displayOrder,
      assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId,
      patternKey: monthlyPatternKey(plan.id, pattern.weekNumber, pattern.dayOfWeek, source.pmBy as PmAnnualBy, (pattern.assetSystemId ?? pattern.zoneId)!),
    } });
    let copied = 0;
    let skipped = 0;
    const scheduleCopies: Array<{ date: string; assetSystemId: string | null; zoneId: string | null; source: string }> = [];
    if (source.scheduleMode === PmAnnualScheduleMode.WEEKLY_PATTERN) {
      const alternateDays = new Set(source.weeklyPatterns.filter(pattern => pattern.weekIndex === 2).map(pattern => pattern.dayOfWeek));
      for (const pattern of source.weeklyPatterns) for (const date of datesInYearForWeekday(input.targetYear, pattern.dayOfWeek)) {
        if (effectivePatternWeekIndex(date, source.patternCycleWeeks, source.rotationAnchorDateKey, alternateDays) !== pattern.weekIndex) continue;
        scheduleCopies.push({ date, assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId, source: PmAnnualScheduleSource.PATTERN });
      }
    } else if (source.scheduleMode === PmAnnualScheduleMode.MONTHLY_PATTERN) {
      for (let month = 1; month <= 12; month += 1) {
        for (const pattern of source.monthlyPatterns ?? []) {
          const date = nthWeekdayOfMonth(input.targetYear, month, pattern.dayOfWeek, pattern.weekNumber);
          if (date) scheduleCopies.push({ date, assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId, source: PmAnnualScheduleSource.PATTERN });
        }
        if (source.monthlyWeek5Rule === PmAnnualMonthlyWeek5Rule.REPEAT_WEEK_1) for (const pattern of (source.monthlyPatterns ?? []).filter(item => item.weekNumber === 1)) {
          const date = nthWeekdayOfMonth(input.targetYear, month, pattern.dayOfWeek, 5);
          if (date) scheduleCopies.push({ date, assetSystemId: pattern.assetSystemId, zoneId: pattern.zoneId, source: PmAnnualScheduleSource.PATTERN });
        }
      }
    } else {
      for (const row of source.schedules.filter(row => row.source === PmAnnualScheduleSource.MANUAL)) {
        const date = `${input.targetYear}${row.scheduleDateKey.slice(4)}`;
        try {
          requireDateInPlanYear(date, input.targetYear);
          scheduleCopies.push({ date, assetSystemId: row.assetSystemId, zoneId: row.zoneId, source: PmAnnualScheduleSource.MANUAL });
        } catch { skipped++; }
      }
    }
    for (const row of scheduleCopies) {
      const targetId = (row.assetSystemId ?? row.zoneId)!;
      await tx.pmAnnualSchedule.create({ data: {
        plantId: input.plantId, planId: plan.id, scheduleDateKey: row.date,
        assetSystemId: row.assetSystemId, zoneId: row.zoneId, source: row.source,
        status: PmAnnualScheduleStatus.SCHEDULED,
        slotKey: targetSlotKey(plan.id, row.date, source.pmBy as PmAnnualBy, targetId),
        recordedById: actorId(actor),
      } });
      copied++;
    }
    await audit(tx, actor, input, plan.id, "ANNUAL_PM_PREVIOUS_YEAR_COPIED", { sourcePlanId: source.id, copied, skipped });
    return { plan, copied, skipped };
  });
}
