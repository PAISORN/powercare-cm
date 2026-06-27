import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work detail review summary", () => {
  it("shows technician completion details before engineer review actions", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    const summaryIndex = source.indexOf("Technician Work Summary");
    const reviewIndex = source.indexOf("Engineer Review");

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(reviewIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeLessThan(reviewIndex);
    expect(source).toContain("work.rootCause");
    expect(source).toContain("work.correctiveAction");
    expect(source).toContain("work.workNote");
  });
});
