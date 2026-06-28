import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin QR Code page", () => {
  it("renders the general request QR from an internal SVG route", () => {
    const source = readFileSync("app/admin/qr-code/page.tsx", "utf8");

    expect(source).toContain("QR Code แจ้งซ่อมทั่วไป");
    expect(source).toContain('const qrImageUrl = "/admin/qr-code/request.svg"');
    expect(source).toContain("getGeneralRequestUrl");
    expect(source).not.toContain("api.qrserver.com");
    expect(source).not.toContain("chart.googleapis.com");
  });
});
