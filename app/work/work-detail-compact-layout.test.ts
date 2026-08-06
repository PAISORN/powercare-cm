import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work detail compact layout", () => {
  it("keeps the work detail page using compact grouped panels", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("work-detail-grid");
    expect(source).toContain("work-action-panel");
    expect(source).toContain("work-compact-form");
    expect(source).toContain("sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch");
    expect(source).toContain("dark:bg-amber-50 dark:text-slate-900");
  });

  it("uses the modern work detail command-center layout", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("work-detail-hero");
    expect(source).toContain("work-meta-strip");
    expect(source).toContain("work-operations-grid");
    expect(source).toContain("work-operation-tabs");
    expect(source).toContain("work-audit-timeline");
    expect(source).toContain("ประวัติสถานะ");
    expect(source).toContain("WorkStatusTimelineRow");
    expect(source).toContain("work.statusHistory.map");
    expect(source).toContain("event.toStatus === WorkStatus.NEW");
    expect(source).toContain("? work.requesterName");
    expect(source).toContain("technicianCompletionTimelineNote");
    expect(source).toContain("whitespace-pre-wrap");
    expect(source).not.toContain("work.auditEvents.map");
  });

  it("keeps the modern work detail layout in the original minimalist surface style", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("work-detail-hero mx-auto w-full max-w-3xl rounded-3xl border border-[var(--line)] bg-[var(--surface)]");
    expect(source).not.toContain("work-detail-hero mx-auto w-full max-w-3xl rounded-3xl border border-cyan");
    expect(source).not.toContain("bg-gradient-to-br");
    expect(source).not.toContain("from-slate-950");
  });

  it("places operations and store request in icon underline tabs", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    const operationsGrid = source.indexOf("work-operations-grid");
    const operationsPanel = source.indexOf("work-operation-tabs", operationsGrid);
    const claimButton = source.indexOf("รับงาน", operationsPanel);
    const assignmentPanel = source.indexOf("มอบหมายงานให้ช่าง", operationsPanel);
    const storeColumn = source.indexOf('workspaceTab === "issue"', operationsGrid);
    const storeRequest = source.indexOf("IssueRequestForm", storeColumn);
    const auditHistory = source.indexOf("work-audit-timeline", operationsPanel);

    expect(operationsGrid).toBeGreaterThan(-1);
    expect(source).toContain('data-testid="work-workspace-tabs"');
    expect(source).toContain("?workspaceTab=operations");
    expect(source).toContain("?workspaceTab=issue");
    expect(source).toContain("border-b-2");
    expect(source).toContain("work-operations-grid mx-auto mt-6 grid w-full max-w-3xl");
    expect(storeColumn).toBeGreaterThan(operationsGrid);
    expect(operationsPanel).toBeGreaterThan(operationsGrid);
    expect(source.slice(operationsPanel - 100, operationsPanel + 180)).toContain("work-operation-tabs rounded-3xl");
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
