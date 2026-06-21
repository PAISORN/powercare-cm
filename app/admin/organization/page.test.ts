import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Admin organization form", () => {
  it("lets React configure multipart encoding for the server action", () => {
    const source = readFileSync("app/admin/organization/page.tsx", "utf8");
    expect(source).not.toContain('encType="multipart/form-data"');
  });
});
