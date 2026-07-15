import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work detail store issue flow", () => {
  it("lets an in-progress claimant request spare parts from the CM work detail page", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("createWorkStoreIssueAction");
    expect(source).toContain("IssueRequestForm");
    expect(source).toContain("lockedCmWork={{ id: work.id");
    expect(source).toContain("cmWorks={[{ id: work.id, number: work.number");
    expect(source).toContain("STORE_ISSUE_FROM_WORK_DETAIL");
  });

  it("passes searchable stock metadata into the embedded store request form", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("storeCategoryName: stock.store.category?.name");
    expect(source).toContain("sparePartCategoryName: stock.sparePart.category?.name");
    expect(source).toContain("db.storeApplicableZone.findMany");
    expect(source).toContain("issueZones={issueZones.map");
    expect(source).toContain("stockStatus: buildStoreStockStatus");
  });

  it("blocks submit-for-review while store issues are still pending approval or issue", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("pendingStoreIssueStatuses");
    expect(source).toContain("hasPendingStoreIssues");
    expect(source).toContain("if (hasPendingStoreIssues) redirect(`/work/${id}?storeIssueBlocked=1`)");
    expect(source).toContain("!hasPendingStoreIssues");
  });

  it("shows linked store issue status rows on the work detail page", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("storeIssues");
    expect(source).toContain("StoreIssueStatusBadge");
    expect(source).toContain("StoreIssuePanel");
    expect(source).toContain("/inventory/tracking");
  });

  it("lets the requester remove a pending store issue before engineer approval", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("cancelOwnPendingStoreIssueAction");
    expect(source).toContain("status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("requesterUserId: currentUser.id");
    expect(source).toContain("db.sparePartIssue.delete");
    expect(source).toContain("CANCEL_PENDING_STORE_ISSUE");
  });
});
