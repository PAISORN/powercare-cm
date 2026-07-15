import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { canPrintSparePartIssueDocument } from "./store-issue-print-permission";
import { StoreIssueStatus } from "./store-types";

const issued = {
  status: StoreIssueStatus.ISSUED,
  organizationId: "org-a",
  plantId: "site-a",
};

describe("spare-part issue print permission", () => {
  it("allows owner admin globally", () => {
    expect(canPrintSparePartIssueDocument({ role: RoleName.ADMIN }, issued)).toBe(true);
  });

  it("limits organization admin to the same organization", () => {
    expect(canPrintSparePartIssueDocument({ role: RoleName.ORGANIZATION_ADMIN, organizationId: "org-a" }, issued)).toBe(true);
    expect(canPrintSparePartIssueDocument({ role: RoleName.ORGANIZATION_ADMIN, organizationId: "org-b" }, issued)).toBe(false);
  });

  it("limits site admin and store officer to the same site", () => {
    expect(canPrintSparePartIssueDocument({ role: RoleName.SITE_ADMIN, plantId: "site-a" }, issued)).toBe(true);
    expect(canPrintSparePartIssueDocument({ role: RoleName.STORE_OFFICER, plantId: "site-b" }, issued)).toBe(false);
  });

  it("blocks other roles and unfinished issues", () => {
    expect(canPrintSparePartIssueDocument({ role: RoleName.ENGINEER, plantId: "site-a" }, issued)).toBe(false);
    expect(canPrintSparePartIssueDocument(
      { role: RoleName.STORE_OFFICER, plantId: "site-a" },
      { ...issued, status: StoreIssueStatus.WAITING_STORE_ISSUE },
    )).toBe(false);
  });
});
