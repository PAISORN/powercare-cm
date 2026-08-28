import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin Users edit experience", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/admin/users/page.tsx"), "utf8");

  it("renders user editing in a modal and restores the saved list position", () => {
    expect(source).toContain("<AdminUserEditModal");
    expect(source).toContain("<RestoreListPosition enabled storageKey={adminUsersListPositionKey} />");
    expect(source).not.toContain("<details className=\"mt-4 overflow-hidden");
  });

  it("returns to the active filters and edited user after saving", () => {
    expect(source).toContain('name="returnTo" type="hidden" value={adminUsersReturnHref}');
    expect(source).toContain('redirect(`${returnTo}#user-${encodeURIComponent(userId)}`)');
  });
});