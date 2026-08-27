import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("All Work repair-request editing", () => {
  const pageSource = readFileSync("app/work/page.tsx", "utf8");
  const serviceSource = readFileSync("modules/cm-work/cm-work-service.ts", "utf8");

  it("opens a right sidebar through the dedicated permission", () => {
    expect(pageSource).toContain("canUseUserPermission(user, PermissionKey.EDIT_WORK_REQUEST)");
    expect(pageSource).toContain('id="edit-work-drawer"');
    expect(pageSource).toContain("fixed inset-y-0 right-0");
    for (const name of ["requesterName", "requesterDepartment", "categoryId", "zoneId", "assetId", "machineName", "problemTitle", "problemDetail", "urgency"]) {
      expect(pageSource).toContain(`name="${name}"`);
    }
  });

  it("checks operational scope before updating from All Work", () => {
    expect(pageSource).toContain("buildWorkScopeWhere(scope)");
    expect(pageSource).toContain("updateWorkRequest");
    expect(pageSource).toContain('safeReturnTo.startsWith("/work")');
  });

  it("keeps the active filters, page, and edited work position", () => {
    expect(pageSource).toContain("workListPositionKey");
    expect(pageSource).toContain("PreserveListPositionLink");
    expect(pageSource).toContain("RestoreListPosition");
    expect(pageSource).toContain("work-row-${work.id}");
    expect(pageSource).toContain('name="returnTo" type="hidden" value={`${returnTo}#work-row-${editWork.id}`}');
  });

  it("validates, authorizes, scopes related records, audits, and refreshes changes", () => {
    const updateBlock = serviceSource.slice(serviceSource.indexOf("export async function updateWorkRequest"), serviceSource.indexOf("export async function assignWork"));
    expect(updateBlock).toContain("canUseUserPermission(actor, PermissionKey.EDIT_WORK_REQUEST)");
    expect(updateBlock).toContain("Category must be active and belong to the same Site");
    expect(updateBlock).toContain("Asset must be active and belong to the selected Site and Zone");
    expect(updateBlock).toContain("work.organizationId !== actor.organizationId");
    expect(updateBlock).toContain("work.plantId !== actor.plantId");
    expect(updateBlock).toContain('action: "UPDATE_WORK_REQUEST"');
    expect(updateBlock).toContain("revalidateCmData");
  });
});