import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin QR Code page", () => {
  it("renders request QR images from an internal SVG route", () => {
    const source = readFileSync("app/admin/qr-code/page.tsx", "utf8");

    expect(source).toContain("QR Code แจ้งซ่อมราย Site");
    expect(source).toContain('const qrImageUrl = "/admin/qr-code/request.svg"');
    expect(source).toContain("getPlantRequestUrl");
    expect(source).not.toContain("api.qrserver.com");
    expect(source).not.toContain("chart.googleapis.com");
  });

  it("protects the QR page with QR Code permission", () => {
    const pageSource = readFileSync("app/admin/qr-code/page.tsx", "utf8");
    const routeSource = readFileSync("app/admin/qr-code/request.svg/route.ts", "utf8");

    expect(pageSource).toContain("canManageQrCode(user)");
    expect(routeSource).toContain("canManageQrCode(user)");
    expect(routeSource).not.toContain("canManageOrganization(user.role");
  });

  it("renders QR cards for each allowed Site", () => {
    const source = readFileSync("app/admin/qr-code/page.tsx", "utf8");

    expect(source).toContain("qrPlants");
    expect(source).toContain("resolveAdminSiteScope(user, query)");
    expect(source).toContain("AdminSiteScopeSelector");
    expect(source).toContain("qrPlants.map((plant)");
    expect(source).toContain("getPlantRequestUrl");
    expect(source).toContain("organizationId=${encodeURIComponent(organizationId)}");
    expect(source).toContain("plantId=${encodeURIComponent(plant.id)}");
    expect(source).toContain("Site QR Code");
  });

  it("generates the QR SVG for the selected Site ID inside the active organization", () => {
    const source = readFileSync("app/admin/qr-code/request.svg/route.ts", "utf8");

    expect(source).toContain('request.nextUrl.searchParams.get("plantId")');
    expect(source).toContain('request.nextUrl.searchParams.get("organizationId")');
    expect(source).toContain("selectedPlantId");
    expect(source).toContain("where: { id: selectedPlantId, organizationId }");
    expect(source).toContain("selectedPlant.code");
    expect(source).toContain("powercare-site-request-qr");
  });
});
