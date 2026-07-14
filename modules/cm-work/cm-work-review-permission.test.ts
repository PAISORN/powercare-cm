import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CM work review permissions", () => {
  it("uses the shared return permission helper instead of hard-coded admin or engineer roles", () => {
    const source = readFileSync("modules/cm-work/cm-work-service.ts", "utf8");

    expect(source).toContain("canReturnWork(actor, work)");
    expect(source).not.toContain("actor.role !== RoleName.ADMIN && actor.role !== RoleName.ENGINEER");
  });

  it("lets organization admins perform owner-level start and submit overrides", () => {
    const source = readFileSync("modules/cm-work/cm-work-service.ts", "utf8");

    expect(source).toContain("isOwnerWorkActor(actor)");
    expect(source).not.toContain("work.claimantId !== actor.id && actor.role !== RoleName.ADMIN");
  });
});
