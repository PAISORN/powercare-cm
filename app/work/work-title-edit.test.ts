import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("All Work title editing", () => {
  const pageSource = readFileSync("app/work/page.tsx", "utf8");
  const serviceSource = readFileSync("modules/cm-work/cm-work-service.ts", "utf8");

  it("shows an inline title editor only through the dedicated permission", () => {
    expect(pageSource).toContain("canUseUserPermission(user, PermissionKey.EDIT_WORK_TITLE)");
    expect(pageSource).toContain("แก้ไขชื่อ");
    expect(pageSource).toContain('name="problemTitle"');
    expect(pageSource).toContain("maxLength={200}");
    expect(pageSource).toContain("updateWorkTitleFromListAction");
  });

  it("checks operational scope before updating from All Work", () => {
    expect(pageSource).toContain("buildWorkScopeWhere(scope)");
    expect(pageSource).toContain("updateWorkProblemTitle");
    expect(pageSource).toContain('safeReturnTo.startsWith("/work")');
  });

  it("validates, authorizes, audits, and refreshes title changes in the service", () => {
    const updateBlock = serviceSource.slice(
      serviceSource.indexOf("export async function updateWorkProblemTitle"),
      serviceSource.indexOf("export async function assignWork"),
    );
    expect(updateBlock).toContain("canUseUserPermission(actor, PermissionKey.EDIT_WORK_TITLE)");
    expect(updateBlock).toContain("normalizedTitle.length > 200");
    expect(updateBlock).toContain("work.organizationId !== actor.organizationId");
    expect(updateBlock).toContain("work.plantId !== actor.plantId");
    expect(updateBlock).toContain('action: "UPDATE_WORK_PROBLEM_TITLE"');
    expect(updateBlock).toContain("revalidateCmData");
  });
});
