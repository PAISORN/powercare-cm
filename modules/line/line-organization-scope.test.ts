import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("LINE organization scope", () => {
  it("scopes LINE destination, discovery, history, and daily report settings by organization and plant when available", () => {
    const settings = readFileSync("modules/line/line-settings-service.ts", "utf8");
    const service = readFileSync("modules/line/line-service.ts", "utf8");
    const discovery = readFileSync("modules/line/line-group-discovery-service.ts", "utf8");
    const daily = readFileSync("modules/line/line-daily-report-settings.ts", "utf8");

    expect(settings).toContain("organizationId?: string");
    expect(settings).toContain("plantId?: string");
    expect(settings).toContain("canManageLineAcrossPlants(actor)");
    expect(settings).toContain("actor.role === RoleName.ORGANIZATION_ADMIN");
    expect(settings).toContain("where: { organizationId, ...(plantId ? { plantId } : {}) }");
    expect(service).toContain("listLineDeliveryHistory(organizationId?: string");
    expect(service).toContain("plantId?: string");
    expect(service).toContain("destination: { ...(organizationId ? { organizationId } : {}), ...(plantId ? { plantId } : {}) }");
    expect(discovery).toContain("organizationId?: string");
    expect(discovery).toContain("where: { organizationId }");
    expect(daily).toContain("getLineDailyReportSetting(organizationId?: string, plantId?: string | null)");
    expect(daily).toContain("getScopedLineDailyReportSettingId(organizationId, plantId)");
    expect(daily).toContain("organizationId");
    expect(daily).toContain("plantId");
  });
});
