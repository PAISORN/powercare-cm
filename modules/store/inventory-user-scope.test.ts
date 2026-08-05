import { describe, expect, it } from "vitest";
import { hasInventoryApproval, hasInventoryResponsibility } from "./inventory-user-scope";

const actor = {
  role: "STORE_OFFICER",
  inventoryScopes: [
    { itemKind: "CHEMICAL", responsibilityEnabled: true, approvalEnabled: false },
    { itemKind: "OIL", responsibilityEnabled: false, approvalEnabled: true },
  ],
};

describe("inventory user scope", () => {
  it("allows mutation only for an enabled responsibility kind", () => {
    expect(hasInventoryResponsibility(actor, "CHEMICAL")).toBe(true);
    expect(hasInventoryResponsibility(actor, "SPARE_PART")).toBe(false);
  });

  it("keeps approval scope independent from responsibility scope", () => {
    expect(hasInventoryApproval(actor, "OIL")).toBe(true);
    expect(hasInventoryApproval(actor, "CHEMICAL")).toBe(false);
  });

  it("allows Owner Admin emergency access across kinds", () => {
    expect(hasInventoryResponsibility({ role: "ADMIN", inventoryScopes: [] }, "CHEMICAL")).toBe(true);
    expect(hasInventoryApproval({ role: "ADMIN", inventoryScopes: [] }, "OIL")).toBe(true);
  });
});
