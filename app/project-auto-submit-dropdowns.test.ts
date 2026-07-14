import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const filterDropdownFiles = [
  "components/dashboard-filter-bar.tsx",
  "components/admin-site-scope-selector.tsx",
  "components/filter-bar.tsx",
  "components/report-filter-form.tsx",
  "app/members/page.tsx",
  "app/reports/report-page-parts.tsx",
  "app/admin/users/page.tsx",
  "app/admin/sites/page.tsx",
  "app/admin/site-admin-permissions/page.tsx",
];

describe("project-wide filter dropdown behavior", () => {
  it("uses the shared auto-submit select for every page-level filter dropdown", () => {
    for (const file of filterDropdownFiles) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("AutoSubmitSelect");
    }
  });

  it("does not keep inline requestSubmit handlers in filter components", () => {
    for (const file of ["components/filter-bar.tsx", "components/report-filter-form.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toContain("event.currentTarget.form?.requestSubmit()");
    }
  });
});
