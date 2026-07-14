import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work detail compact layout", () => {
  it("keeps the work detail page using compact grouped panels", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("work-detail-grid");
    expect(source).toContain("work-action-panel");
    expect(source).toContain("work-compact-form");
  });

  it("uses the modern work detail command-center layout", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("work-detail-hero");
    expect(source).toContain("work-meta-strip");
    expect(source).toContain("work-operations-grid");
    expect(source).toContain("work-operation-tabs");
    expect(source).toContain("work-audit-timeline");
  });

  it("keeps the modern work detail layout in the original minimalist surface style", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("work-detail-hero rounded-2xl border border-[var(--line)] bg-[var(--surface)]");
    expect(source).not.toContain("work-detail-hero rounded-2xl border border-cyan");
    expect(source).not.toContain("bg-gradient-to-br");
    expect(source).not.toContain("from-slate-950");
  });

  it("places operations with audit history on the left and store request on the right", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    const operationsGrid = source.indexOf("work-operations-grid");
    const operationsPanel = source.indexOf("work-operation-tabs", operationsGrid);
    const claimButton = source.indexOf("รับงาน", operationsPanel);
    const assignmentPanel = source.indexOf("มอบหมายงานให้ช่าง", operationsPanel);
    const storeColumn = source.indexOf('className="order-2 grid content-start gap-4"', operationsGrid);
    const storeRequest = source.indexOf("IssueRequestForm", storeColumn);
    const auditHistory = source.indexOf("work-audit-timeline", operationsPanel);

    expect(operationsGrid).toBeGreaterThan(-1);
    expect(source.slice(operationsGrid, operationsGrid + 180)).toContain("xl:grid-cols-[minmax(320px,4fr)_minmax(0,6fr)]");
    expect(storeColumn).toBeGreaterThan(operationsGrid);
    expect(operationsPanel).toBeGreaterThan(operationsGrid);
    expect(source.slice(operationsPanel, operationsPanel + 180)).toContain("work-operation-tabs order-1");
    expect(claimButton).toBeGreaterThan(operationsPanel);
    expect(assignmentPanel).toBeGreaterThan(operationsPanel);
    expect(storeRequest).toBeGreaterThan(storeColumn);
    expect(operationsPanel).toBeGreaterThan(storeRequest);
    expect(auditHistory).toBeGreaterThan(operationsPanel);
  });

  it("hides the old operation tab labels and supports canceling a pending store issue request", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("cancelOwnPendingStoreIssueAction");
    expect(source).toContain("requesterUserId: true");
    expect(source).toContain("issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("issue.requesterUserId === currentUserId");
    expect(source).not.toContain("grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--line)] text-sm font-bold sm:grid-cols-4");
    expect(source).not.toContain("RotateCcw");
    expect(source).not.toContain("Archive");
    expect(source).not.toContain("Ban");
  });
});
