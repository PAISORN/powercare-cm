import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveRequestPlantScope } from "./plant-request-scope";

describe("request plant scope", () => {
  it("resolves active plants by normalized plant code", async () => {
    const calls: string[] = [];
    const plant = await resolveRequestPlantScope(
      {
        async findActivePlantByCode(code) {
          calls.push(code);
          return { id: "plant-a", organizationId: "primary", code, name: "Plant A" };
        },
        async findDefaultPlant() {
          throw new Error("default plant should not be used");
        },
      },
      " Plant A ",
    );

    expect(calls).toEqual(["plant-a"]);
    expect(plant.id).toBe("plant-a");
  });

  it("falls back to the default plant when the code is empty or not found", async () => {
    const plant = await resolveRequestPlantScope(
      {
        async findActivePlantByCode() {
          return null;
        },
        async findDefaultPlant() {
          return { id: "primary-plant", organizationId: "primary", code: "main", name: "Main Plant" };
        },
      },
      "missing",
    );

    expect(plant.id).toBe("primary-plant");
    expect(plant.code).toBe("main");
  });

  it("does not restrict public QR code lookup to the default organization", () => {
    const source = readFileSync("modules/organization/plant-request-scope.ts", "utf8");

    expect(source).toContain("where: { code, active: true }");
    expect(source).not.toContain("where: { organizationId: DEFAULT_ORGANIZATION_ID, code, active: true }");
  });
});
