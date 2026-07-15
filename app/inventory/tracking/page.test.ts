import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inventory tracking page", () => {
  it("shows detailed store issue progress like CM tracking", () => {
    const source = readFileSync("app/inventory/tracking/page.tsx", "utf8");

    expect(source).toContain("StoreTrackingStepper");
    expect(source).toContain("รายละเอียดใบเบิก");
    expect(source).toContain("ประวัติสถานะ");
    expect(source).toContain("รายการอะไหล่");
    expect(source).toContain("auditEvent.findMany");
    expect(source).toContain('entityType: "SparePartIssue"');
    expect(source).toContain("WAITING_ENGINEER_APPROVAL");
    expect(source).toContain("WAITING_STORE_ISSUE");
    expect(source).toContain("ISSUED");
  });
});
