import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("night dashboard glass surfaces", () => {
  it("scopes glassmorphism to the CM and Store dashboard roots", () => {
    const cmDashboard = readFileSync("app/dashboardcm/page.tsx", "utf8");
    const storeDashboard = readFileSync("app/dashboardstore/page.tsx", "utf8");

    expect(cmDashboard).toContain('className="dashboard-glass-scope contents"');
    expect(storeDashboard).toContain('className="dashboard-glass-scope w-full');
  });

  it("keeps the frosted blur behind the night theme selector", () => {
    const styles = readFileSync("app/globals.css", "utf8");
    const glassStart = styles.indexOf("/* Dashboard CM + Store: frosted surfaces");
    const glassEnd = styles.indexOf("/* Asset detail", glassStart);
    const glassStyles = styles.slice(glassStart, glassEnd);

    expect(glassStart).toBeGreaterThan(-1);
    expect(glassStyles).toContain('[data-theme="night"] .dashboard-glass-scope');
    expect(glassStyles).toContain("backdrop-filter: blur(18px) saturate(135%)");
    expect(glassStyles.match(/\[data-theme="night"\]/g)?.length).toBe(5);
  });
});