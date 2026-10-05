import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PM work CM handoff UI", () => {
  it("offers explicit CM creation only for completed abnormal work with permission", () => {
    const source = readFileSync("app/dashboardpm/work/[id]/page.tsx", "utf8");
    expect(source).toContain('work.status === "COMPLETED" && work.result === "ABNORMAL"');
    expect(source).toContain("PermissionKey.CREATE_INTERNAL_REQUEST");
    expect(source).toContain("สร้างงาน CM จากผล PM");
    expect(source).toContain('name="categoryId"');
    expect(source).toContain('name="zoneId"');
    expect(source).toContain("createCmFromAbnormalPm");
  });

  it("renders a PM to CM link after handoff", () => {
    const source = readFileSync("app/dashboardpm/work/[id]/page.tsx", "utf8");
    expect(source).toContain("work.originatingCmWork");
    expect(source).toContain("`/work/${work.originatingCmWork.id}`");
  });

  it("lets every PM executor start and complete work without an assignment gate", () => {
    const source = readFileSync("app/dashboardpm/work/[id]/page.tsx", "utf8");
    expect(source).toContain('executor && work.status === "PLANNED"');
    expect(source).toContain('executor && work.status === "IN_PROGRESS"');
    expect(source).not.toContain('executor && performer && work.status === "PLANNED"');
    expect(source).not.toContain('executor && performer && work.status === "IN_PROGRESS"');
  });
});
