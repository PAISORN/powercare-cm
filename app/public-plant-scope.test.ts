import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public plant scope", () => {
  it("keeps plant code through request success and tracking lookups", () => {
    const request = readFileSync("app/request/page.tsx", "utf8");
    const success = readFileSync("app/request/success/[number]/page.tsx", "utf8");
    const tracking = readFileSync("app/tracking/page.tsx", "utf8");

    expect(request).toContain("redirect(`/request/success/${work.number}?plant=${encodeURIComponent(plantCode ?? \"\")}`)");
    expect(success).toContain("readRequestPlantScope(plantCode)");
    expect(success).toContain("where: { number, plantId: plantScope.id }");
    expect(success).toContain("href={`/tracking?plant=${plantScope.code}&number=${number}`}");
    expect(tracking).toContain("readRequestPlantScope(plantCode)");
    expect(tracking).toContain("where: { number, plantId: plantScope.id }");
  });

  it("offers plant-code tracking route for QR based public access", () => {
    const plantTracking = readFileSync("app/p/[plantCode]/tracking/page.tsx", "utf8");

    expect(plantTracking).toContain("TrackingPageContent");
    expect(plantTracking).toContain("plantCode={plantCode}");
  });
});
