import { describe, expect, it } from "vitest";
import { buildAssetQrDetailRows } from "./asset-qr-actions";

describe("Asset QR label", () => {
  it("places the required details below the QR code in the requested order", () => {
    expect(buildAssetQrDetailRows({ code: "RTB-PSH-1101-001", assetClass: "Instrument", assetType: "Pressure Switch", assetFamily: "PSH-1101 · Hydraulic Pump", assetName: "Hydraulic Pump" })).toEqual([
      ["รหัสเครื่องจักร", "RTB-PSH-1101-001"], ["Asset Class", "Instrument"], ["Asset Type", "Pressure Switch"], ["Asset Family", "PSH-1101 · Hydraulic Pump"], ["ชื่อเครื่องจักร", "Hydraulic Pump"],
    ]);
  });
});
