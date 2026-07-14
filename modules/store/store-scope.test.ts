import { describe, expect, it } from "vitest";
import {
  assertCmReferenceInStoreScope,
  canIssueRequestedQuantity,
  canPublicRequesterUseContactField,
  resolveStoreIssueType,
} from "./store-scope";
import { StoreIssueType } from "./store-types";

describe("store scope", () => {
  const scope = { organizationId: "org-1", plantId: "site-1", plantCode: "RTB" };

  it("allows CM reference only inside the same site", () => {
    expect(() =>
      assertCmReferenceInStoreScope(
        { id: "cm-1", number: "CM-1", organizationId: "org-1", plantId: "site-1" },
        scope,
      ),
    ).not.toThrow();

    expect(() =>
      assertCmReferenceInStoreScope(
        { id: "cm-2", number: "CM-2", organizationId: "org-1", plantId: "site-2" },
        scope,
      ),
    ).toThrow("outside the selected site scope");
  });

  it("resolves issue type from CM reference", () => {
    expect(resolveStoreIssueType("cm-1")).toBe(StoreIssueType.CM_REFERENCED);
    expect(resolveStoreIssueType(null)).toBe(StoreIssueType.DIRECT);
  });

  it("keeps public contact field behind a permission flag", () => {
    expect(canPublicRequesterUseContactField(true)).toBe(true);
    expect(canPublicRequesterUseContactField(false)).toBe(false);
  });

  it("detects not enough stock before Store Officer issue", () => {
    expect(canIssueRequestedQuantity(10, 8)).toBe(true);
    expect(canIssueRequestedQuantity(4, 8)).toBe(false);
    expect(() => canIssueRequestedQuantity(4, 0)).toThrow("greater than zero");
  });
});
