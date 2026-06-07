import { describe, expect, it } from "vitest";
import { RoleName, WorkStatus } from "../cm-work/cm-work-types";
import { canCancelWork, canClaimWork, canCloseWork, canPrintCompletionDocument } from "./permission";

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
});
