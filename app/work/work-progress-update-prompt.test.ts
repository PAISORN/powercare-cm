import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work progress update prompt", () => {
  it("shows an update form when claimed or in-progress work has no activity for seven days", () => {
    const source = [
      "modules/cm-work/work-detail-page-data.ts",
      "app/work/[id]/actions.ts",
      "components/work-detail-page/work-detail-workspace.tsx",
    ].map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).toContain("needsProgressUpdateReminder");
    expect(source).toContain("latestWorkActivityAt");
    expect(source).toContain("progressUpdateAction");
    expect(source).toContain("UPDATE_WORK_PROGRESS");
    expect(source).toContain("7 วัน");
    expect(source).toContain("อัปเดตงาน");
  });
});
