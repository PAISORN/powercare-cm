import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plant QR URL", () => {
  it("renders the current plant request URL on the admin QR page", () => {
    const source = readFileSync("app/admin/qr-code/page.tsx", "utf8");
    expect(source).toContain("resolveAdminSiteScope");
    expect(source).toContain("getPlantRequestUrl");
    expect(source).toContain("requestPlantCode");
    expect(source).toContain("scope.plant");
  });

  it("generates QR images from the current plant request URL", () => {
    const source = readFileSync("app/admin/qr-code/request.svg/route.ts", "utf8");
    expect(source).toContain("readOrganizationScope");
    expect(source).toContain("getPlantRequestUrl");
    expect(source).toContain("selectedPlant.code");
    expect(source).toContain("request.nextUrl.searchParams.get");
  });
});
