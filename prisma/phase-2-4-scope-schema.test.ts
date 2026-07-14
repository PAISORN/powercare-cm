import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("phase 2.4 scoped support schema", () => {
  for (const schema of ["prisma/schema.prisma", "prisma/schema.supabase.prisma"]) {
    it(`adds organization/plant scope to audit and LINE support tables in ${schema}`, () => {
      const source = readFileSync(schema, "utf8");

      expect(source).toContain("organizationId String?");
      expect(source).toContain("plantId        String?");
      expect(source).toContain("organization   Organization?");
      expect(source).toContain("plant          Plant?");
      expect(source).toContain("@@index([organizationId");
      expect(source).toContain("@@index([plantId");
    });
  }
});
