import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cmFindMany: vi.fn(),
  issueFindMany: vi.fn(),
  canUse: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    cmWork: { findMany: mocks.cmFindMany },
    sparePartIssue: { findMany: mocks.issueFindMany },
  },
}));
vi.mock("../auth/permission", () => ({ canCloseWork: vi.fn(() => true) }));
vi.mock("../auth/site-admin-permissions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../auth/site-admin-permissions")>();
  return { ...actual, canUseUserPermission: mocks.canUse };
});

import { PermissionKey } from "../auth/site-admin-permissions";
import { loadActivityPageData } from "./activity-page-data";
import type { ActivityScope } from "./activity-types";

const user = {
  id: "user-1",
  role: "ENGINEER",
  categoryId: "cat-1",
  categories: [{ categoryId: "cat-1" }],
  inventoryScopes: [
    {
      itemKind: "CHEMICAL",
      approvalEnabled: true,
      responsibilityEnabled: true,
    },
  ],
  siteAdminPermissions: [],
};
const scope = {
  organization: { id: "org-1" },
  plant: { id: "site-1" },
} as ActivityScope;

describe("loadActivityPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cmFindMany.mockResolvedValue([]);
    mocks.issueFindMany.mockResolvedValue([]);
  });

  it("skips CM and Store queues when their view permissions are disabled", async () => {
    mocks.canUse.mockReturnValue(false);
    await loadActivityPageData(user as never, scope, {});
    expect(mocks.cmFindMany).not.toHaveBeenCalled();
    expect(mocks.issueFindMany).not.toHaveBeenCalled();
  });

  it("loads every enabled queue inside the selected Site", async () => {
    mocks.canUse.mockImplementation(
      (_user, key) =>
        key === PermissionKey.VIEW_MY_ACTIVITIES_CM ||
        key === PermissionKey.VIEW_MY_ACTIVITIES_STORE ||
        key === PermissionKey.APPROVE_STORE_ISSUE ||
        key === PermissionKey.ISSUE_STOCK,
    );
    await loadActivityPageData(user as never, scope, {});

    expect(mocks.cmFindMany).toHaveBeenCalledTimes(2);
    expect(mocks.issueFindMany).toHaveBeenCalledTimes(3);
    for (const [args] of [
      ...mocks.cmFindMany.mock.calls,
      ...mocks.issueFindMany.mock.calls,
    ]) {
      expect(args.where.plantId).toBe("site-1");
    }
  });
});
