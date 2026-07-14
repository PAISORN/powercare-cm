import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory tracking page", () => {
  it("shows store issue progress with a tracking timeline", () => {
    const source = readFileSync("app/inventory/tracking/page.tsx", "utf8");

    expect(source).toContain("StoreTrackingTimeline");
    expect(source).toContain("store-tracking-step");
    expect(source).toContain("WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("WAITING_STORE_ISSUE");
    expect(source).toContain("ISSUED");
  });
});
