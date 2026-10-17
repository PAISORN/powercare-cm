import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Week 5 production migration artifact", () => {
  it("widens both existing checks atomically without rewriting planning or work history", () => {
    const sql = readFileSync("prisma/supabase-migrations/20261016222105_annual_pm_pattern_week_five.sql", "utf8");
    expect(sql).toMatch(/BEGIN;/);
    expect(sql).toMatch(/COMMIT;/);
    expect(sql).toContain('DROP CONSTRAINT "PmAnnualMonthlyWeek_weekNumber_check"');
    expect(sql).toContain('DROP CONSTRAINT "PmAnnualMonthlyPattern_weekNumber_check"');
    expect(sql.match(/CHECK \("weekNumber" BETWEEN 1 AND 5\)/g)).toHaveLength(2);
    expect(sql).not.toMatch(/\b(?:DELETE FROM|UPDATE|DROP TABLE|TRUNCATE)\b/i);
  });
});
