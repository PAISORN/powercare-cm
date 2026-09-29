import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const tx:any={
  pmAnnualSiteSetting:{upsert:vi.fn()}, pmSiteCalendarDay:{upsert:vi.fn(),findFirstOrThrow:vi.fn(),delete:vi.fn()},
  pmAnnualPlan:{findFirstOrThrow:vi.fn(),create:vi.fn()}, pmAnnualSchedule:{findFirstOrThrow:vi.fn(),findMany:vi.fn(),findUnique:vi.fn(),update:vi.fn(),create:vi.fn()},
  pmAnnualWeeklyPattern:{create:vi.fn()}, asset:{findMany:vi.fn()}, plant:{findFirstOrThrow:vi.fn()}, pmPlan:{findFirst:vi.fn(),create:vi.fn(),update:vi.fn()},
  pmPlanSequence:{upsert:vi.fn()},pmAnnualReleaseBatch:{upsert:vi.fn()},pmWork:{findMany:vi.fn(),create:vi.fn()},pmAnnualWorkSource:{upsert:vi.fn()},pmAnnualReleaseSchedule:{upsert:vi.fn()},pmAnnualReleaseExclusion:{upsert:vi.fn()},auditEvent:{create:vi.fn()},
};
const db:any={$transaction:vi.fn(async(fn:any)=>fn(tx)),pmAnnualSiteSetting:{upsert:vi.fn()},pmSiteCalendarDay:{findMany:vi.fn()}};
vi.mock("../../lib/db",()=>({db}));
vi.mock("../../lib/date-time/bangkok-time",()=>({getBangkokDateString:vi.fn(()=>"2026-09-20")}));
const actor={id:"eng",role:RoleName.ENGINEER,organizationId:"org",plantId:"site"};
const scope={organizationId:"org",plantId:"site"};
const plan={id:"annual",...scope,name:"Annual",year:2026,pmBy:"SYSTEM",scheduleMode:"MANUAL",status:"ACTIVE"};
const schedule={id:"s1",plantId:"site",planId:"annual",scheduleDateKey:"2026-09-21",assetSystemId:"sys",zoneId:null,source:"MANUAL",status:"SCHEDULED",slotKey:"slot",releasedAt:null};

describe("Annual PM Phase 2 service",()=>{
 beforeEach(()=>{vi.clearAllMocks();db.$transaction.mockImplementation(async(fn:any)=>fn(tx));tx.pmAnnualSiteSetting.upsert.mockResolvedValue({plantId:"site",releaseWindowDays:30,workloadWarningThreshold:1});tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue(plan);tx.pmAnnualSchedule.findMany.mockResolvedValue([schedule]);tx.asset.findMany.mockResolvedValue([{id:"a1",code:"MA-001",nameTh:"Pump",assetLevel:"MAIN_ASSET",systemId:"sys",zoneId:null,operatingStatus:"UNDER_REPAIR"}]);tx.auditEvent.create.mockResolvedValue({});});
 it("preserves the original row when moving a schedule to another date",async()=>{tx.pmAnnualSchedule.findFirstOrThrow.mockResolvedValue(schedule);tx.pmAnnualSchedule.findUnique.mockResolvedValue(null);tx.pmAnnualSchedule.create.mockResolvedValue({...schedule,id:"s2",scheduleDateKey:"2026-09-22",source:"OVERRIDE"});const {moveAnnualPmScheduleDate}=await import("./pm-annual-phase2-service");await moveAnnualPmScheduleDate(actor,{...scope,planId:"annual",scheduleId:"s1",destinationDateKey:"2026-09-22",reason:"Shutdown moved"});expect(tx.pmAnnualSchedule.update).toHaveBeenCalledWith({where:{id:"s1"},data:expect.objectContaining({status:"MOVED",slotKey:null})});expect(tx.pmAnnualSchedule.create).toHaveBeenCalledWith({data:expect.objectContaining({originalScheduleId:"s1",overrideAction:"MOVE",scheduleDateKey:"2026-09-22"})});});
 it("previews current Assets for Active or Draft plans and raises non-blocking warnings",async()=>{const {previewAnnualPmRelease}=await import("./pm-annual-phase2-service");const result=await previewAnnualPmRelease(actor,{...scope,planId:"annual",scheduleDateKey:"2026-09-21"});expect(result.assets).toHaveLength(1);expect(result.warningAssets).toHaveLength(1);expect(result.workload.warning).toBe(false);expect(tx.pmAnnualPlan.findFirstOrThrow).toHaveBeenCalledWith({where:expect.objectContaining({status:{in:["ACTIVE","DRAFT"]}})});expect(tx.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({registrationStatus:"ACTIVE",assetLevel:{in:["MAIN_ASSET","SUB_ASSET","PART_ASSET"]}})}));});
 it("releases a selected day atomically into numbered PM Work and immutable Annual sources",async()=>{tx.plant.findFirstOrThrow.mockResolvedValue({id:"site",code:"RTB"});tx.pmPlan.findFirst.mockResolvedValue({id:"daily",...scope,plannedDateKey:"2026-09-21",status:"CONFIRMED",number:"PMP-RTB-20260920-001",creationDateKey:"2026-09-20",lastWorkSequence:0});tx.pmAnnualReleaseBatch.upsert.mockResolvedValue({id:"batch"});tx.pmWork.findMany.mockResolvedValue([]);tx.pmWork.create.mockResolvedValue({id:"work",assetId:"a1"});const {releaseAnnualPmDay}=await import("./pm-annual-phase2-service");const result=await releaseAnnualPmDay(actor,{...scope,planId:"annual",scheduleDateKey:"2026-09-21",scheduleIds:["s1"],now:new Date("2026-09-20T00:00:00Z")});expect(result.workCount).toBe(1);expect(tx.pmWork.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({number:"PM-RTB-20260920-001-001",assetCodeSnapshot:"MA-001"})}));expect(tx.pmAnnualWorkSource.upsert).toHaveBeenCalled();expect(tx.pmAnnualSchedule.update).toHaveBeenCalledWith({where:{id:"s1"},data:expect.objectContaining({status:"RELEASED"})});});
 it("copies a Weekly Pattern by weekday without carrying source-year exception dates",async()=>{tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({...plan,year:2026,scheduleMode:"WEEKLY_PATTERN",patternCycleWeeks:1,rotationAnchorDateKey:null,weeklyPatterns:[{dayOfWeek:1,weekIndex:1,assetSystemId:"sys",zoneId:null}],schedules:[{...schedule,source:"OVERRIDE"}]});tx.pmAnnualPlan.create.mockResolvedValue({...plan,id:"copy",year:2027,status:"DRAFT"});tx.pmAnnualSchedule.create.mockResolvedValue({});const {copyPreviousAnnualPmPlan}=await import("./pm-annual-phase2-service");const result=await copyPreviousAnnualPmPlan(actor,{...scope,sourcePlanId:"annual",targetYear:2027});expect(result.copied).toBeGreaterThan(50);const dates=tx.pmAnnualSchedule.create.mock.calls.map((call:any)=>call[0].data.scheduleDateKey);expect(dates.every((date:string)=>new Date(`${date}T00:00:00Z`).getUTCDay()===1)).toBe(true);expect(tx.pmAnnualSchedule.create.mock.calls.some((call:any)=>call[0].data.source==="OVERRIDE")).toBe(false);}); it("copies the two-week rotation into the next year with Week A/B preserved",async()=>{
   tx.pmAnnualPlan.findFirstOrThrow.mockResolvedValue({...plan,year:2026,scheduleMode:"WEEKLY_PATTERN",patternCycleWeeks:2,rotationAnchorDateKey:"2026-12-28",weeklyPatterns:[
     {dayOfWeek:1,weekIndex:1,assetSystemId:"sys-monday",zoneId:null},
     {dayOfWeek:3,weekIndex:1,assetSystemId:"sys-a",zoneId:null},
     {dayOfWeek:3,weekIndex:2,assetSystemId:"sys-b",zoneId:null},
   ],schedules:[]});
   tx.pmAnnualPlan.create.mockResolvedValue({...plan,id:"copy",year:2027,status:"DRAFT"});
   tx.pmAnnualSchedule.create.mockResolvedValue({});
   const {copyPreviousAnnualPmPlan}=await import("./pm-annual-phase2-service");
   await copyPreviousAnnualPmPlan(actor,{...scope,sourcePlanId:"annual",targetYear:2027});
   expect(tx.pmAnnualPlan.create.mock.calls[0][0].data).toMatchObject({patternCycleWeeks:2,rotationAnchorDateKey:"2026-12-28"});
   const created=tx.pmAnnualSchedule.create.mock.calls.map((call:any)=>call[0].data);
   expect(created.find((row:any)=>row.scheduleDateKey==="2027-01-06")?.assetSystemId).toBe("sys-b");
   expect(created.find((row:any)=>row.scheduleDateKey==="2027-01-13")?.assetSystemId).toBe("sys-a");
   expect(created.find((row:any)=>row.scheduleDateKey==="2027-01-04")?.assetSystemId).toBe("sys-monday");
   expect(created.find((row:any)=>row.scheduleDateKey==="2027-01-11")?.assetSystemId).toBe("sys-monday");
   expect(tx.pmAnnualWeeklyPattern.create.mock.calls.map((call:any)=>call[0].data.weekIndex)).toEqual([1,1,2]);
 });});
