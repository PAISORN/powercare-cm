import { describe, expect, it } from "vitest";
import {
  assetFormDateValue,
  registeredAssetInputFromFormData,
  technicalValuesFromFormData,
} from "./asset-registration-form";

describe("Asset registration form", () => {
  it("builds the same normalized registration input for create and edit", () => {
    const formData = new FormData();
    formData.set("systemId", " system-a ");
    formData.set("assetTypeId", "type-a");
    formData.set("assetLevel", "MAIN_ASSET");
    formData.set("nameEn", " Boiler Feed Pump ");
    formData.set("operatingStatus", "IN_SERVICE");
    formData.set("criticality", "HIGH");
    formData.set("installedAt", "2026-09-28");

    const input = registeredAssetInputFromFormData(formData, {
      plantId: "plant-a",
      code: "MC-PMP-001",
      metadataJson: "{}",
    });

    expect(input).toMatchObject({
      plantId: "plant-a",
      code: "MC-PMP-001",
      systemId: "system-a",
      assetTypeId: "type-a",
      assetLevel: "MAIN_ASSET",
      nameTh: "Boiler Feed Pump",
      nameEn: "Boiler Feed Pump",
      operatingStatus: "IN_SERVICE",
      criticality: "HIGH",
      metadataJson: "{}",
    });
    expect(input.installedAt?.toISOString()).toBe("2026-09-27T17:00:00.000Z");
    expect(input.commissionedAt).toBeNull();
  });

  it("collects only technical field values", () => {
    const formData = new FormData();
    formData.set("nameTh", "Pump");
    formData.set("tech_voltage", " 400 ");
    formData.set("tech_phase", "3");

    expect(technicalValuesFromFormData(formData)).toEqual({
      voltage: " 400 ",
      phase: "3",
    });
  });

  it("formats stored dates for native date inputs", () => {
    expect(assetFormDateValue(new Date("2026-09-28T00:00:00.000Z"))).toBe(
      "2026-09-28",
    );
    expect(assetFormDateValue(null)).toBe("");
  });
});
