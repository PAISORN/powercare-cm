import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readModels(path: string) {
  const source = readFileSync(path, "utf8");
  const models = new Map<string, Map<string, string>>();

  for (const match of source.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)) {
    const [, modelName, body] = match;
    const fields = new Map<string, string>();
    for (const line of body.split("\n")) {
      const field = line.match(/^\s{2}(\w+)\s+([^\s]+)/);
      if (field) fields.set(field[1], field[2]);
    }
    models.set(modelName, fields);
  }

  return models;
}

describe("Prisma schema parity", () => {
  it("keeps local SQLite and Supabase model fields aligned", () => {
    expect(readModels("prisma/schema.supabase.prisma")).toEqual(readModels("prisma/schema.prisma"));
  });

  it("migrates the LINE destination site scope used by daily reports", () => {
    const migration = readFileSync(
      "prisma/supabase-migrations/20260702_line_destination_plant_scope.sql",
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "LineDestination" ADD COLUMN IF NOT EXISTS "plantId" TEXT');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS "LineDestination_plantId_active_idx"');
  });
});
