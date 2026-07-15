import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/inventory/public-issue/page.tsx", "utf8");

describe("Issue Public management page", () => {
  it("builds a site-scoped public link and QR code", () => {
    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain("getPlantStoreIssueUrl");
    expect(source).toContain("QRCode.toDataURL");
    expect(source).toContain("PublicIssueLinkActions");
  });
});
