import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), canViewPm: vi.fn(), resolvePmPageScope: vi.fn(),
  queryPmWorkExport: vi.fn(), recordAudit: vi.fn(), createPmWorkCsv: vi.fn(),
}));
vi.mock("../../../lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("../../../modules/auth/permission", () => ({ canViewPm: mocks.canViewPm }));
vi.mock("../../../modules/pm/pm-page-scope", () => ({ resolvePmPageScope: mocks.resolvePmPageScope }));
vi.mock("../../../modules/pm/pm-query", () => ({ PM_CSV_EXPORT_MAX_ROWS: 10_000, queryPmWorkExport: mocks.queryPmWorkExport }));
vi.mock("../../../modules/audit/audit-service", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("../../../modules/pm/pm-csv", () => ({ createPmWorkCsv: mocks.createPmWorkCsv }));
import { GET } from "./route";

describe("PM CSV export route", () => {
  const source = readFileSync("app/dashboardpm/export/route.ts", "utf8");
  beforeEach(() => {
    vi.clearAllMocks(); mocks.getCurrentUser.mockResolvedValue({ id: "u1" }); mocks.canViewPm.mockReturnValue(true);
    mocks.resolvePmPageScope.mockResolvedValue({ organization: { id: "o1" }, plant: { id: "p1" } });
    mocks.queryPmWorkExport.mockResolvedValue({ exceeded: false, rows: [] }); mocks.createPmWorkCsv.mockReturnValue("\uFEFFcsv");
  });
  it("authenticates, authorizes, resolves exact active scope and audits the export", () => {
    expect(source).toContain("getCurrentUser()");
    expect(source).toContain("canViewPm(user)");
    expect(source).toContain("resolvePmPageScope(user");
    expect(source).toContain("queryPmWorkExport(filter, serviceScope)");
    expect(source).toContain("recordAudit");
    expect(source).toContain('action: "EXPORT_PM_WORK_CSV"');
  });
  it("returns CSV rather than reusing the XLSX helper", () => {
    expect(source).toContain("createPmWorkCsv(rows)");
    expect(source).toContain("text/csv; charset=utf-8");
    expect(source).not.toContain("createCmWorkWorkbook");
  });
  it("rejects an over-limit export before CSV materialization or success audit", async () => {
    mocks.queryPmWorkExport.mockResolvedValue({ exceeded: true, rows: [] });
    const response = await GET(new Request("http://localhost/dashboardpm/export?organizationId=o1&plantId=p1"));
    expect(response.status).toBe(413); expect(await response.text()).toContain("10,000 row limit");
    expect(mocks.createPmWorkCsv).not.toHaveBeenCalled(); expect(mocks.recordAudit).not.toHaveBeenCalled();
  });

  it("audits the exact scoped successful row count", async () => {
    mocks.queryPmWorkExport.mockResolvedValue({ exceeded: false, rows: [{ id: "w1" }] });
    const response = await GET(new Request("http://localhost/dashboardpm/export?organizationId=o1&plantId=p1"));
    expect(response.status).toBe(200); expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: "u1", organizationId: "o1", plantId: "p1", after: expect.objectContaining({ rowCount: 1 }) }));
  });
});
