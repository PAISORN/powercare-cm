import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin Users edit experience", () => {
  const source = [
    "app/admin/users/page.tsx",
    "app/admin/users/actions.ts",
    "modules/users/admin-user-page-model.ts",
    "modules/users/admin-users-page-data.ts",
    "modules/users/managed-user-mutation.ts",
    "components/inventory-user-scope-fields.tsx",
    "components/admin-users-page/admin-users-workspace.tsx",
  ].map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");

  it("renders user editing in a modal and restores the saved list position", () => {
    expect(source).toContain("<AdminUserEditModal");
    expect(source).toContain("<RestoreListPosition enabled storageKey={adminUsersListPositionKey} />");
    expect(source).not.toContain("<details className=\"mt-4 overflow-hidden");
  });

  it("returns to the active filters and edited user after saving", () => {
    expect(source).toContain('name="returnTo" type="hidden" value={adminUsersReturnHref}');
    expect(source).toContain('redirect(`${returnTo}#user-${encodeURIComponent(userId)}`)');
  });

  it("keeps delete orchestration behind the managed-user mutation interface", () => {
    expect(source).toContain("parseDeleteManagedUserInput(formData)");
    expect(source).toContain('issue === "invalid-password"');
    expect(source).toContain('redirect("/admin/users?deleteStatus=error")');
  });
});
