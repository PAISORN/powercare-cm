import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectSourceFiles(path) : /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("Bangkok time usage", () => {
  it("does not format visible timestamps with the server timezone", () => {
    const offenders = collectSourceFiles(join(process.cwd(), "app"))
      .filter((path) => !path.endsWith("bangkok-time-usage.test.ts"))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return (
          source.includes('.toLocaleString("th-TH")') ||
          source.includes('new Intl.DateTimeFormat("th-TH"') ||
          source.includes('new Intl.DateTimeFormat("en-GB"')
        );
      });

    expect(offenders).toEqual([]);
  });
});
