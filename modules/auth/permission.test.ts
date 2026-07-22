import { describe, expect, it } from "vitest";
import { RoleName, WorkStatus } from "../cm-work/cm-work-types";
import {
  canAssignWork,
  canCancelWork,
  canClaimWork,
  canCloseWork,
  canManageAnnouncements,
  canManageCategory,
  canManageEngineerAssignmentSetting,
  canManageFeedback,
  canManageLineSettings,
  canManagePlantProfile,
  canTestLineMessaging,
  canManageOrganization,
  canManageQrCode,
  canManageSites,
  canManageSlaDueDate,
  canManageZone,
  canPrintCompletionDocument,
  canReturnWork,
  canUpdateSystemSettings,
  canExportReports,
  canViewMemberWorkload,
  canViewPlantAuditLog,
  canViewReports,
} from "./permission";
import { PermissionKey, type SiteAdminPermissionRecord } from "./site-admin-permissions";

const electrical = "cat-electrical";
const mechanical = "cat-mechanical";

describe("category permissions", () => {
  it("lets admin act across categories", () => {
    const admin = { id: "admin", role: RoleName.ADMIN, categoryId: null };
    expect(canClaimWork(admin, { status: WorkStatus.NEW, categoryId: electrical, claimantId: null })).toBe(true);
    expect(canCancelWork(admin, { status: WorkStatus.IN_PROGRESS, categoryId: mechanical, claimantId: "tech" })).toBe(true);
  });

  it("lets engineer act only in own category", () => {
    const engineer = { id: "eng", role: RoleName.ENGINEER, categoryId: electrical };
    expect(canCancelWork(engineer, { status: WorkStatus.NEW, categoryId: electrical, claimantId: null })).toBe(true);
    expect(canCancelWork(engineer, { status: WorkStatus.NEW, categoryId: mechanical, claimantId: null })).toBe(false);
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: electrical, claimantId: "tech" })).toBe(true);
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: mechanical, claimantId: "tech" })).toBe(false);
  });

  it("lets engineer act across explicitly assigned categories", () => {
    const engineer = { id: "eng", role: RoleName.ENGINEER, categoryId: electrical, categoryIds: [electrical, mechanical] };
    expect(canClaimWork(engineer, { status: WorkStatus.NEW, categoryId: electrical, claimantId: null })).toBe(true);
    expect(canClaimWork(engineer, { status: WorkStatus.NEW, categoryId: mechanical, claimantId: null })).toBe(true);
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: mechanical, claimantId: "tech" })).toBe(true);
  });

  it("lets technician claim only own category and never cancel", () => {
    const tech = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical };
    expect(canClaimWork(tech, { status: WorkStatus.NEW, categoryId: electrical, claimantId: null })).toBe(true);
    expect(canClaimWork(tech, { status: WorkStatus.NEW, categoryId: mechanical, claimantId: null })).toBe(false);
    expect(canCancelWork(tech, { status: WorkStatus.IN_PROGRESS, categoryId: electrical, claimantId: "tech" })).toBe(false);
  });

  it("lets every logged-in role print closed work", () => {
    const tech = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical };
    expect(canPrintCompletionDocument(tech, { status: WorkStatus.CLOSED, categoryId: mechanical, claimantId: "other" })).toBe(true);
    expect(canPrintCompletionDocument(tech, { status: WorkStatus.CANCELED, categoryId: mechanical, claimantId: "other" })).toBe(false);
  });

  it("keeps visitor role read-only", () => {
    const visitor = { id: "visitor", role: RoleName.VISITOR, categoryId: null };
    const work = { status: WorkStatus.NEW, categoryId: electrical, claimantId: null };

    expect(canClaimWork(visitor, work)).toBe(false);
    expect(canAssignWork(visitor, work, true)).toBe(false);
    expect(canCancelWork(visitor, { ...work, status: WorkStatus.IN_PROGRESS, claimantId: "tech" })).toBe(false);
    expect(canCloseWork(visitor, { ...work, status: WorkStatus.WAITING_TO_CLOSE, claimantId: "tech" })).toBe(false);
    expect(canPrintCompletionDocument(visitor, { ...work, status: WorkStatus.CLOSED, claimantId: "tech" })).toBe(false);
  });

  it("shows member workload only to owner, site admin, and engineer roles", () => {
    expect(canViewMemberWorkload(RoleName.ADMIN)).toBe(true);
    expect(canViewMemberWorkload(RoleName.ORGANIZATION_ADMIN)).toBe(true);
    expect(canViewMemberWorkload(RoleName.SITE_ADMIN)).toBe(true);
    expect(canViewMemberWorkload(RoleName.ENGINEER)).toBe(true);
    expect(canViewMemberWorkload(RoleName.TECHNICIAN)).toBe(false);
    expect(canViewMemberWorkload(RoleName.VISITOR)).toBe(false);
  });

  it("shows reports to owner admins, Site Admin, and engineer", () => {
    expect(canViewReports(RoleName.ADMIN)).toBe(true);
    expect(canViewReports(RoleName.ORGANIZATION_ADMIN)).toBe(true);
    expect(canViewReports(RoleName.SITE_ADMIN)).toBe(true);
    expect(canViewReports(RoleName.ENGINEER)).toBe(true);
    expect(canViewReports(RoleName.TECHNICIAN)).toBe(false);
    expect(canViewReports(RoleName.VISITOR)).toBe(false);
  });

  it("requires export report checkbox for Site Admin exports", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };

    expect(canViewReports(plantAdmin)).toBe(true);
    expect(canExportReports(plantAdmin)).toBe(false);
    expect(
      canExportReports({
        ...plantAdmin,
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.EXPORT_REPORTS, enabled: true },
        ],
      }),
    ).toBe(true);
  });
});

describe("work assignment permissions", () => {
  const openElectricalWork = {
    status: WorkStatus.NEW,
    categoryId: electrical,
    claimantId: null,
  };

  it("allows admin regardless of the engineer switch", () => {
    const admin = { id: "admin", role: RoleName.ADMIN, categoryId: null };
    expect(canAssignWork(admin, openElectricalWork, false)).toBe(true);
  });

  it("requires Site Admin checkbox permissions for assignment, cancel, and close actions", () => {
    const records = (permissionKey: string): SiteAdminPermissionRecord[] => [
      { userId: "plant-admin", plantId: "plant-1", permissionKey, enabled: true },
    ];
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, categoryId: null, plantId: "plant-1" };

    expect(canAssignWork(plantAdmin, openElectricalWork, false)).toBe(false);
    expect(canCancelWork(plantAdmin, { ...openElectricalWork, status: WorkStatus.IN_PROGRESS, claimantId: "tech" })).toBe(false);
    expect(canCloseWork(plantAdmin, { ...openElectricalWork, status: WorkStatus.WAITING_TO_CLOSE, claimantId: "tech" })).toBe(false);

    expect(canAssignWork({ ...plantAdmin, siteAdminPermissions: records(PermissionKey.ASSIGN_WORK) }, openElectricalWork, false)).toBe(true);
    expect(canCancelWork({ ...plantAdmin, siteAdminPermissions: records(PermissionKey.CANCEL_WORK) }, { ...openElectricalWork, status: WorkStatus.IN_PROGRESS, claimantId: "tech" })).toBe(true);
    expect(canCloseWork({ ...plantAdmin, siteAdminPermissions: records(PermissionKey.CLOSE_WORK) }, { ...openElectricalWork, status: WorkStatus.WAITING_TO_CLOSE, claimantId: "tech" })).toBe(true);
  });

  it("allows engineer only when enabled and category matches", () => {
    const engineer = { id: "eng", role: RoleName.ENGINEER, categoryId: electrical };
    expect(canAssignWork(engineer, openElectricalWork, true)).toBe(true);
    expect(canAssignWork(engineer, openElectricalWork, false)).toBe(false);
    expect(canAssignWork(engineer, { ...openElectricalWork, categoryId: mechanical }, true)).toBe(false);
  });

  it("rejects technicians, claimed work, and terminal work", () => {
    const technician = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical };
    const admin = { id: "admin", role: RoleName.ADMIN, categoryId: null };
    expect(canAssignWork(technician, openElectricalWork, true)).toBe(false);
    expect(canAssignWork(admin, { ...openElectricalWork, claimantId: "other" }, true)).toBe(false);
    expect(canAssignWork(admin, { ...openElectricalWork, status: WorkStatus.CLOSED }, true)).toBe(false);
  });

  it("keeps work actions scoped to the actor plant unless the actor is admin", () => {
    const workInPlantB = { ...openElectricalWork, plantId: "plant-b" };
    const technician = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical, plantId: "plant-a" };
    const engineer = { id: "eng", role: RoleName.ENGINEER, categoryId: electrical, plantId: "plant-a" };
    const plantAdmin = {
      id: "plant-admin",
      role: RoleName.SITE_ADMIN,
      categoryId: null,
      plantId: "plant-a",
      siteAdminPermissions: [
        { userId: "plant-admin", plantId: "plant-a", permissionKey: PermissionKey.ASSIGN_WORK, enabled: true },
        { userId: "plant-admin", plantId: "plant-a", permissionKey: PermissionKey.CANCEL_WORK, enabled: true },
        { userId: "plant-admin", plantId: "plant-a", permissionKey: PermissionKey.CLOSE_WORK, enabled: true },
      ],
    };
    const admin = { id: "admin", role: RoleName.ADMIN, categoryId: null, plantId: "plant-a" };

    expect(canClaimWork(technician, workInPlantB)).toBe(false);
    expect(canAssignWork(plantAdmin, workInPlantB, false)).toBe(false);
    expect(canCancelWork(plantAdmin, { ...workInPlantB, status: WorkStatus.IN_PROGRESS, claimantId: "tech" })).toBe(false);
    expect(canCloseWork(plantAdmin, { ...workInPlantB, status: WorkStatus.WAITING_TO_CLOSE, claimantId: "tech" })).toBe(false);
    expect(canReturnWork(engineer, { ...workInPlantB, status: WorkStatus.WAITING_TO_CLOSE, claimantId: "tech" })).toBe(false);
    expect(canPrintCompletionDocument(technician, { ...workInPlantB, status: WorkStatus.CLOSED, claimantId: "tech" })).toBe(false);

    expect(canClaimWork(admin, workInPlantB)).toBe(true);
  });

  it("lets Site Admin return waiting-close work only with close permission in the same plant", () => {
    const work = { ...openElectricalWork, status: WorkStatus.WAITING_TO_CLOSE, claimantId: "tech", plantId: "plant-1" };
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, categoryId: null, plantId: "plant-1" };

    expect(canReturnWork(plantAdmin, work)).toBe(false);
    expect(
      canReturnWork(
        {
          ...plantAdmin,
          siteAdminPermissions: [
            { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.CLOSE_WORK, enabled: true },
          ],
        },
        work,
      ),
    ).toBe(true);
  });

  it("allows only admin to update system settings", () => {
    expect(canUpdateSystemSettings(RoleName.ADMIN)).toBe(true);
    expect(canUpdateSystemSettings(RoleName.SITE_ADMIN)).toBe(false);
    expect(canUpdateSystemSettings(RoleName.ENGINEER)).toBe(false);
    expect(canUpdateSystemSettings(RoleName.TECHNICIAN)).toBe(false);
  });

  it("requires engineer assignment checkbox permission for Site Admin engineer assignment mode", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };

    expect(canManageEngineerAssignmentSetting(RoleName.ADMIN)).toBe(true);
    expect(canManageEngineerAssignmentSetting(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageEngineerAssignmentSetting(plantAdmin)).toBe(false);
    expect(
      canManageEngineerAssignmentSetting({
        ...plantAdmin,
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_ENGINEER_ASSIGNMENT, enabled: true },
        ],
      }),
    ).toBe(true);
    expect(canManageEngineerAssignmentSetting(RoleName.ENGINEER)).toBe(false);
    expect(canManageEngineerAssignmentSetting(RoleName.TECHNICIAN)).toBe(false);
  });

  it("requires SLA checkbox permission for Site Admin SLA settings", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };

    expect(canManageSlaDueDate(RoleName.ADMIN)).toBe(true);
    expect(canManageSlaDueDate(plantAdmin)).toBe(false);
    expect(
      canManageSlaDueDate({
        ...plantAdmin,
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_SLA_DUE_DATE, enabled: true },
        ],
      }),
    ).toBe(true);
    expect(canManageSlaDueDate(RoleName.ENGINEER)).toBe(false);
  });
});

describe("LINE settings permissions", () => {
  it("requires the LINE settings checkbox for Site Admin access", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };

    expect(canManageLineSettings(RoleName.ADMIN)).toBe(true);
    expect(canManageLineSettings(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageLineSettings(plantAdmin)).toBe(false);
    expect(
      canManageLineSettings({
        ...plantAdmin,
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_LINE_SETTINGS, enabled: true },
        ],
      }),
    ).toBe(true);
    expect(canManageLineSettings(RoleName.ENGINEER)).toBe(false);
    expect(canManageLineSettings(RoleName.TECHNICIAN)).toBe(false);
  });

  it("requires the test LINE messaging checkbox for Site Admin test sends", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };

    expect(canTestLineMessaging(RoleName.ADMIN)).toBe(true);
    expect(canTestLineMessaging(RoleName.SITE_ADMIN)).toBe(false);
    expect(canTestLineMessaging(plantAdmin)).toBe(false);
    expect(
      canTestLineMessaging({
        ...plantAdmin,
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.TEST_LINE_MESSAGING, enabled: true },
        ],
      }),
    ).toBe(true);
    expect(canTestLineMessaging(RoleName.ENGINEER)).toBe(false);
    expect(canTestLineMessaging(RoleName.VISITOR)).toBe(false);
  });
});

describe("organization permissions", () => {
  it("requires checkbox permissions for Site Admin configuration pages", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };
    const withPermission = (permissionKey: string) => ({
      ...plantAdmin,
      siteAdminPermissions: [
        { userId: "plant-admin", plantId: "plant-1", permissionKey, enabled: true },
      ],
    });

    expect(canManageOrganization(RoleName.ADMIN)).toBe(true);
    expect(canManageSites(RoleName.ADMIN)).toBe(true);
    expect(canManageCategory(RoleName.ADMIN)).toBe(true);
    expect(canManageZone(RoleName.ADMIN)).toBe(true);
    expect(canManageQrCode(RoleName.ADMIN)).toBe(true);

    expect(canManageOrganization(RoleName.ORGANIZATION_ADMIN)).toBe(true);
    expect(canManageSites(RoleName.ORGANIZATION_ADMIN)).toBe(true);
    expect(canManageCategory(RoleName.ORGANIZATION_ADMIN)).toBe(true);
    expect(canManageZone(RoleName.ORGANIZATION_ADMIN)).toBe(true);
    expect(canManageQrCode(RoleName.ORGANIZATION_ADMIN)).toBe(true);

    expect(canManageOrganization(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageSites(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageCategory(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageZone(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageQrCode(RoleName.SITE_ADMIN)).toBe(false);

    expect(canManageOrganization(plantAdmin)).toBe(false);
    expect(canManageSites(plantAdmin)).toBe(false);
    expect(canManageCategory(plantAdmin)).toBe(false);
    expect(canManageZone(plantAdmin)).toBe(false);
    expect(canManageQrCode(plantAdmin)).toBe(false);

    expect(canManageOrganization(withPermission(PermissionKey.MANAGE_PLANT_PROFILE))).toBe(false);
    expect(canManagePlantProfile(withPermission(PermissionKey.MANAGE_PLANT_PROFILE))).toBe(true);
    expect(canManageSites(withPermission(PermissionKey.MANAGE_PLANT_PROFILE))).toBe(false);
    expect(canManageCategory(withPermission(PermissionKey.MANAGE_CATEGORY))).toBe(true);
    expect(canManageZone(withPermission(PermissionKey.MANAGE_ZONE))).toBe(true);
    expect(canManageQrCode(withPermission(PermissionKey.MANAGE_QR_CODE))).toBe(true);
  });

  it("keeps announcements and feedback as super admin tools", () => {
    expect(canManageAnnouncements(RoleName.ADMIN)).toBe(true);
    expect(canManageAnnouncements(RoleName.ORGANIZATION_ADMIN)).toBe(false);
    expect(canManageAnnouncements(RoleName.SITE_ADMIN)).toBe(false);
    expect(canManageFeedback(RoleName.ADMIN)).toBe(true);
    expect(canManageFeedback(RoleName.ORGANIZATION_ADMIN)).toBe(false);
    expect(canManageFeedback(RoleName.SITE_ADMIN)).toBe(false);
  });

  it("requires audit log checkbox permission for Site Admin history access", () => {
    const plantAdmin = { id: "plant-admin", role: RoleName.SITE_ADMIN, plantId: "plant-1" };

    expect(canViewPlantAuditLog(RoleName.ADMIN)).toBe(true);
    expect(canViewPlantAuditLog(RoleName.SITE_ADMIN)).toBe(false);
    expect(canViewPlantAuditLog(plantAdmin)).toBe(false);
    expect(
      canViewPlantAuditLog({
        ...plantAdmin,
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.VIEW_AUDIT_LOG_PLANT, enabled: true },
        ],
      }),
    ).toBe(true);
  });
});
