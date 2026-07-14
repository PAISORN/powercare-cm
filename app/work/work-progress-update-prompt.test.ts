import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work progress update prompt", () => {
  it("shows an update form when claimed or in-progress work is older than one day", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("needsProgressUpdate");
    expect(source).toContain("progressUpdateAction");
    expect(source).toContain("UPDATE_WORK_PROGRESS");
    expect(source).toContain("อัปเดตงาน");
  });
});
