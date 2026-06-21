import { describe, expect, it } from "vitest";
import { RoleName, WorkStatus } from "../cm-work/cm-work-types";
import {
  canAssignWork,
  canCancelWork,
  canClaimWork,
  canCloseWork,
  canManageLineSettings,
  canManageOrganization,
  canPrintCompletionDocument,
  canUpdateSystemSettings,
  canViewMemberWorkload,
} from "./permission";

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
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: electrical, claimantId: "tech" })).toBe(true);
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: mechanical, claimantId: "tech" })).toBe(false);
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

  it("shows member workload only to admin and engineer", () => {
    expect(canViewMemberWorkload(RoleName.ADMIN)).toBe(true);
    expect(canViewMemberWorkload(RoleName.ENGINEER)).toBe(true);
    expect(canViewMemberWorkload(RoleName.TECHNICIAN)).toBe(false);
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

  it("allows only admin to update system settings", () => {
    expect(canUpdateSystemSettings(RoleName.ADMIN)).toBe(true);
    expect(canUpdateSystemSettings(RoleName.ENGINEER)).toBe(false);
    expect(canUpdateSystemSettings(RoleName.TECHNICIAN)).toBe(false);
  });
});

describe("LINE settings permissions", () => {
  it("allows only Admin to manage LINE destinations and event settings", () => {
    expect(canManageLineSettings(RoleName.ADMIN)).toBe(true);
    expect(canManageLineSettings(RoleName.ENGINEER)).toBe(false);
    expect(canManageLineSettings(RoleName.TECHNICIAN)).toBe(false);
  });
});

describe("organization permissions", () => {
  it("allows only Admin to manage the organization profile", () => {
    expect(canManageOrganization(RoleName.ADMIN)).toBe(true);
    expect(canManageOrganization(RoleName.ENGINEER)).toBe(false);
    expect(canManageOrganization(RoleName.TECHNICIAN)).toBe(false);
  });
});
