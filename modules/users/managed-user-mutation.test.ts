import { describe, expect, it } from "vitest";
import {
  buildInventoryScopeRows,
  getInventoryScopeRequirementIssue,
} from "./managed-user-mutation";

describe("managed user inventory scopes", () => {
  it("merges responsibility and approval into one row per item kind", () => {
    expect(
      buildInventoryScopeRows(
        ["SPARE_PART", "CHEMICAL"],
        ["CHEMICAL", "OIL"],
      ),
    ).toEqual([
      {
        itemKind: "SPARE_PART",
        responsibilityEnabled: true,
        approvalEnabled: false,
      },
      {
        itemKind: "CHEMICAL",
        responsibilityEnabled: true,
        approvalEnabled: true,
      },
      {
        itemKind: "OIL",
        responsibilityEnabled: false,
        approvalEnabled: true,
      },
    ]);
  });

  it("omits item kinds with neither responsibility nor approval", () => {
    expect(buildInventoryScopeRows([], [])).toEqual([]);
  });

  it("requires responsibility for an active Store Officer", () => {
    expect(
      getInventoryScopeRequirementIssue({
        active: true,
        approvalAllowed: false,
        role: "STORE_OFFICER",
        responsibilityKinds: [],
        approvalKinds: [],
      }),
    ).toBe("inventory-scope-required");
  });

  it("requires approval scope only when approval permission is effective", () => {
    expect(
      getInventoryScopeRequirementIssue({
        active: true,
        approvalAllowed: true,
        role: "ENGINEER",
        responsibilityKinds: [],
        approvalKinds: [],
      }),
    ).toBe("approval-scope-required");
    expect(
      getInventoryScopeRequirementIssue({
        active: true,
        approvalAllowed: false,
        role: "ENGINEER",
        responsibilityKinds: [],
        approvalKinds: [],
      }),
    ).toBeNull();
  });
});
