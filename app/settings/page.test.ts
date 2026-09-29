import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("personal settings page", () => {
  const source = readFileSync(join(process.cwd(), "app/settings/page.tsx"), "utf8");

  it("requires a signed-in user and keeps personal preferences separate from admin settings", () => {
    expect(source).toContain("await requireUser()");
    expect(source).toContain("SettingsPreferencesForm");
    expect(source).not.toContain("canManageEngineerAssignmentSetting");
  });
});
