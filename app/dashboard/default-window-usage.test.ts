import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard default window wiring", () => {
  for (const file of ["app/dashboard/page.tsx", "app/page.tsx"]) {
    it(`uses explicit date detection and query-limited priority rows in ${file}`, () => {
      const source = readFileSync(file, "utf8");

      expect(source).toContain("hasExplicitCmDateFilter");
      expect(source).toContain("getDashboardSummaryForDateFilter");
      expect(source).not.toContain("priorityWorks.slice(0, 5)");
    });
  }
});
