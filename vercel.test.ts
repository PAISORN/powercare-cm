import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel cron configuration", () => {
  it("runs the LINE daily report at 08:00 Thailand time", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };

    expect(config.crons).toContainEqual({
      path: "/api/line/daily-report",
      schedule: "0 1 * * *",
    });
  });
});
