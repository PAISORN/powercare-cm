import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("run-e2e concurrency isolation", () => {
  const source = readFileSync("scripts/run-e2e.ps1", "utf8");

  it("allocates a free port and passes a per-run base URL", () => {
    expect(source).toContain("TcpListener");
    expect(source).toContain("$env:E2E_BASE_URL = $url");
    expect(source).toContain("if ($server.HasExited)");
  });

  it("uses unique logs, results, and SQLite fixtures", () => {
    expect(source).toContain("$runId =");
    expect(source).toContain('"e2e-$runId.db"');
    expect(source).toContain('"e2e-$runId"');
    expect(source).toContain("--output $resultDir");
  });

  it("serializes Next mutation and restores next-env bytes", () => {
    expect(source).toContain('"workspace.lock"');
    expect(source).toContain("[System.IO.File]::ReadAllBytes($nextEnvPath)");
    expect(source).toContain("[System.IO.File]::WriteAllBytes($nextEnvPath, $nextEnvBytes)");
    expect(source).toContain("$workspaceLock.Dispose()");
  });
});
