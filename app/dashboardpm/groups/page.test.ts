import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/dashboardpm/groups/page.tsx", "utf8");

describe("PM Groups page", () => {
  it("authorizes the route and every mutation before resolving Site scope", () => {
    expect(source).toContain("canManagePmGroups(user)");
    expect(source).toContain("resolveAction(formData)");
    expect(source).toContain("resolvePmPageScope(user");
  });

  it("uses scoped PM Group service commands rather than direct database writes", () => {
    expect(source).toContain("createPmGroup(user");
    expect(source).toContain("updatePmGroup(user");
    expect(source).not.toContain("updatePmGroupIdentity(user");
    expect(source).not.toContain("replacePmGroupMembership(user");
    expect(source).toContain("setPmGroupActive(user");
    expect(source).toContain("deleteUnusedPmGroup(user");
    expect(source).not.toContain("db.pmGroup");
  });

  it("renders the searchable picker for create and edit flows with empty-group feedback", () => {
    expect(source.match(/<PmGroupAssetPicker/g)).toHaveLength(2);
    expect(source).toContain("Empty group");
    expect(source).toContain("Code locked after use");
    expect(source).toContain("staleAssets={group.assets");
    expect(source).toContain("!eligibleAssetIds.has(membership.assetId)");
  });
});
