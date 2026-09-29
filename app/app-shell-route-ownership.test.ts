import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const templateDirectories = [
  "app/activities",
  "app/admin",
  "app/assets",
  "app/dashboard-v2-mockup",
  "app/dashboardcm",
  "app/dashboardpm",
  "app/logout",
  "app/members",
  "app/notifications",
  "app/profile",
  "app/settings",
  "app/dashboardstore/movements",
  "app/dashboardstore/public-issue",
  "app/dashboardstore/receive",
  "app/dashboardstore/reports",
  "app/dashboardstore/spare-parts",
  "app/dashboardstore/stock",
  "app/dashboardstore/tracking",
] as const;

describe("AppShell route ownership", () => {
  it("assigns authenticated subtrees to remounting route templates", () => {
    for (const directory of templateDirectories) {
      const source = fs.readFileSync(path.join(directory, "template.tsx"), "utf8");
      expect(source, directory).toContain("AuthenticatedRouteShell as default");
    }
  });

  it("keeps AppShell construction at explicit route owners and mixed public adapters", () => {
    expect(findAppShellConsumers()).toEqual([
      "app/dashboardstore/issue/page.tsx",
      "app/dashboardstore/page.tsx",
      "app/reports/page.tsx",
      "app/request/request-page-content.tsx",
      "app/request/success/[number]/page.tsx",
      "app/tracking/page.tsx",
      "app/work/[id]/page.tsx",
      "app/work/page.tsx",
      "components/authenticated-route-shell.tsx",
    ]);
  });

  it("keeps print routes outside AppShell ownership", () => {
    for (const file of [
      "app/dashboardstore/issue/[id]/print/page.tsx",
      "app/reports/print/page.tsx",
      "app/work/[id]/print/page.tsx",
    ]) {
      expect(fs.readFileSync(file, "utf8"), file).not.toContain("AppShell");
    }
  });

  it("memoizes the authenticated user within one server render", () => {
    const sessionSource = fs.readFileSync("lib/session.ts", "utf8");
    const shellSource = fs.readFileSync("components/app-shell.tsx", "utf8");

    expect(sessionSource).toContain('import { cache } from "react"');
    expect(sessionSource).toContain(
      "export const getCurrentUser = cache(async function getCurrentUser()",
    );
    expect(shellSource).not.toContain("immersiveMobile");
  });
});

function findAppShellConsumers() {
  return ["app", "components"]
    .flatMap((directory) => walkTsxFiles(directory))
    .filter((file) => !file.endsWith(".test.tsx"))
    .filter((file) => fs.readFileSync(file, "utf8").includes("<AppShell"))
    .map((file) => file.replaceAll("\\", "/"))
    .sort();
}

function walkTsxFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkTsxFiles(file);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [file] : [];
  });
}
