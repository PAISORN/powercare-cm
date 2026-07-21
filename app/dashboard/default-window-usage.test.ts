import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard default window wiring", () => {
  it("uses explicit date detection and query-limited priority rows", () => {
    const source = readFileSync("app/dashboard/page.tsx", "utf8");

    expect(source).toContain("hasExplicitCmDateFilter");
    expect(source).toContain("getDashboardSummaryForDateFilter");
    expect(source).not.toContain("priorityWorks.slice(0, 5)");
  });
});
