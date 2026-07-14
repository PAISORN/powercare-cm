import { describe, expect, it } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";
import {
  readEngineerAssignmentSetting,
  updateEngineerAssignmentSetting,
  type SystemSettingsStore,
} from "./system-settings-service";

function createStore(initial?: boolean): SystemSettingsStore & { audits: Array<{ action: string }> } {
  let enabled = initial;
  const audits: Array<{ action: string }> = [];

  return {
    audits,
    async read() {
      return enabled === undefined ? null : { id: "global", engineerWorkAssignmentEnabled: enabled };
    },
    async update(next, actorId) {
      const before = enabled ?? false;
      enabled = next;
      audits.push({ action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING" });
      return { before, after: next, actorId };
    },
  };
}

describe("system settings service", () => {
  it("defaults engineer assignment to disabled when no row exists", async () => {
    expect(await readEngineerAssignmentSetting(createStore())).toBe(false);
  });

  it("lets admin update and records the audit action", async () => {
    const store = createStore(false);
    await updateEngineerAssignmentSetting({ id: "admin", role: RoleName.ADMIN, categoryId: null }, true, store);
    expect(await readEngineerAssignmentSetting(store)).toBe(true);
    expect(store.audits).toEqual([{ action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING" }]);
  });

  it("lets Site Admin update engineer assignment mode only with checkbox permission", async () => {
    const store = createStore(false);
    await updateEngineerAssignmentSetting(
      {
        id: "plant-admin",
        role: RoleName.SITE_ADMIN,
        categoryId: null,
        plantId: "plant-1",
        siteAdminPermissions: [
          { userId: "plant-admin", plantId: "plant-1", permissionKey: PermissionKey.MANAGE_ENGINEER_ASSIGNMENT, enabled: true },
        ],
      },
      true,
      store,
    );
    expect(await readEngineerAssignmentSetting(store)).toBe(true);
  });

  it("rejects Site Admin without engineer assignment checkbox permission", async () => {
    const store = createStore(false);
    await expect(
      updateEngineerAssignmentSetting(
        { id: "plant-admin", role: RoleName.SITE_ADMIN, categoryId: null, plantId: "plant-1" },
        true,
        store,
      ),
    ).rejects.toThrow("Only admin can update engineer assignment settings");
  });

  it("rejects engineer updates", async () => {
    const store = createStore(false);
    await expect(
      updateEngineerAssignmentSetting(
        { id: "eng", role: RoleName.ENGINEER, categoryId: "electrical" },
        true,
        store,
      ),
    ).rejects.toThrow("Only admin can update engineer assignment settings");
  });
});
