import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("work detail plant scope", () => {
  it("opens and prints work only from the signed-in user's operational scope", () => {
    const detail = readFileSync("app/work/[id]/page.tsx", "utf8");
    const print = readFileSync("app/work/[id]/print/page.tsx", "utf8");

    expect(detail).toContain("buildUserOperationalScope");
    expect(detail).toContain("const scope = buildUserOperationalScope(user)");
    expect(detail).toContain("db.cmWork.findFirstOrThrow");
    expect(detail).toContain("where: { id, ...buildWorkScopeWhere(scope) }");
    expect(detail).toContain("const actionScope = buildUserOperationalScope(currentUser)");
    expect(detail).toContain("where: { id, claimantId: actor.id, ...buildWorkScopeWhere(actionScope) }");
    expect(detail).toContain("role: RoleName.TECHNICIAN");
    expect(detail).toContain("OR: [{ categoryId: work.categoryId }, { categories: { some: { categoryId: work.categoryId } } }]");
    expect(print).toContain("buildUserOperationalScope");
    expect(print).toContain("where: { id, ...buildWorkScopeWhere(scope) }");
    expect(print).toContain("const [plantProfile, organizationProfile] = await Promise.all");
    expect(print).toContain("plantProfile?.hasLogo");
    expect(print).toContain("organizationProfile.hasLogo");
  });
});
