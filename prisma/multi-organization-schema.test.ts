import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sqliteSchema = readFileSync("prisma/schema.prisma", "utf8");
const supabaseSchema = readFileSync("prisma/schema.supabase.prisma", "utf8");

describe("multi-organization schema foundation", () => {
  it.each([
    ["local sqlite", sqliteSchema],
    ["supabase postgres", supabaseSchema],
  ])("%s schema defines Organization, Plant, and optional scope columns", (_label, schema) => {
    expect(schema).toContain("model Organization");
    expect(schema).toContain("model Plant");
    expect(schema).toContain("maxUsers");
    expect(schema).toContain("maxWorkRequests");
    expect(schema).toContain("model UserCategory");
    expect(schema).toContain("organizationId String?");
    expect(schema).toContain("plantId        String?");
    expect(schema).toContain("@@unique([organizationId, code])");
  });
});
