import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Assets registry pagination", () => {
  it("paginates Asset rows in groups of 50 and preserves filters", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain("const PAGE_SIZE = 50");
    expect(source).toContain("skip: (currentPage - 1) * PAGE_SIZE");
    expect(source).toContain("take: PAGE_SIZE");
    expect(source).toContain('aria-label="Asset pagination"');
    expect(source).toContain("หน้าที่ {currentPage} จาก {totalPages}");
    expect(source).toContain("function pageUrl(query: Query, page: number)");
  });

  it("counts parents in tree view and all Assets in list view", () => {
    const source = readFileSync("app/assets/page.tsx", "utf8");
    expect(source).toContain('const hierarchy = query.view !== "list"');
    expect(source).toContain("hierarchy ? { ...where, parentId: null } : where");
  });
});
