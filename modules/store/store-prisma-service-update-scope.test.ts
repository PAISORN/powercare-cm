import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("updateSparePart inventory responsibility", () => {
  it("reserves inventory type reclassification for Owner Admin", () => {
    const source = readFileSync("modules/store/store-prisma-service.ts", "utf8");
    const updateBlock = source.slice(
      source.indexOf("export async function updateSparePart("),
      source.indexOf("export async function deleteSparePart("),
    );

    expect(updateBlock).toContain("hasInventoryResponsibility(actor, existing.itemKind)");
    expect(updateBlock).not.toContain("hasInventoryResponsibility(actor, normalized.itemKind)");
    expect(updateBlock).toContain("normalized.itemKind !== existing.itemKind && actor.role !== RoleName.ADMIN");
    expect(updateBlock).toContain("Only Owner Admin can change the inventory item type.");
    expect(updateBlock.indexOf("existing.itemKind")).toBeLessThan(updateBlock.indexOf("itemKind: normalized.itemKind"));
  });

  it("locks the inventory type selector for non-admin editors on both management pages", () => {
    for (const page of ["app/dashboardstore/stock/page.tsx", "app/dashboardstore/spare-parts/page.tsx"]) {
      const source = readFileSync(page, "utf8");
      expect(source).toContain('aria-disabled={user.role !== "ADMIN"}');
      expect(source).toContain('tabIndex={user.role === "ADMIN" ? 0 : -1}');
      expect(source).toContain('user.role === "ADMIN" ? "" : "pointer-events-none');
    }
  });
});
