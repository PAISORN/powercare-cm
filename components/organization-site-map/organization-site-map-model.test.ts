import { describe, expect, it } from "vitest";
import {
  clampZoom,
  filterOrganizationTree,
  getOrganizationBranchIds,
  getUserCategoryIds,
  type ChartOrganization,
} from "./organization-site-map-model";

const tree: ChartOrganization[] = [{
  id: "org-a",
  name: "Organization A",
  slug: "ORG-A",
  users: [{ id: "admin-a", username: "admin", fullName: "Alice Admin", role: "ORGANIZATION_ADMIN", active: true }],
  plants: [{
    id: "site-a",
    code: "STA",
    name: "Site Alpha",
    _count: { users: 2, works: 1, zones: 1 },
    users: [
      { id: "active", username: "active", fullName: "Active Engineer", role: "ENGINEER", active: true },
      { id: "inactive", username: "inactive", fullName: "Inactive Technician", role: "TECHNICIAN", active: false },
    ],
  }],
}];

describe("organization site map model", () => {
  it("builds stable organization and site branch ids", () => {
    expect(getOrganizationBranchIds(tree)).toEqual(["org:org-a", "site:site-a"]);
  });

  it("finds a nested user while retaining its organization and site ancestors", () => {
    const result = filterOrganizationTree(tree, "active engineer", false);

    expect(result).toHaveLength(1);
    expect(result[0].plants).toHaveLength(1);
    expect(result[0].plants[0].users.map((user) => user.id)).toEqual(["active"]);
  });

  it("removes inactive users without hiding a matching active branch", () => {
    const result = filterOrganizationTree(tree, "", true);

    expect(result[0].plants[0].users.map((user) => user.id)).toEqual(["active"]);
  });

  it("deduplicates legacy and multi-category selections", () => {
    expect(getUserCategoryIds({
      categoryId: "cat-a",
      categories: [{ categoryId: "cat-a", category: { name: "A" } }, { categoryId: "cat-b", category: { name: "B" } }],
    })).toEqual(["cat-a", "cat-b"]);
  });

  it("keeps zoom inside the supported range", () => {
    expect(clampZoom(0.1)).toBe(0.55);
    expect(clampZoom(2)).toBe(1.6);
    expect(clampZoom(1.234)).toBe(1.23);
  });
});
