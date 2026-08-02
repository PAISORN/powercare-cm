import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequestAssetFields } from "./request-asset-fields";

const zones = [{ id: "ash", name: "ASH handing" }, { id: "fuel", name: "Fuel Warehouse" }];
const assets = [
  { id: "a1", code: "RTB-ASC-001", nameEn: "Ash Screw Sealing No. 1", nameTh: "", zoneId: "ash" },
  { id: "a2", code: "RTB-FCP-001", nameEn: "Fuel Picking Crane", nameTh: "", zoneId: "fuel" },
];

describe("RequestAssetFields", () => {
  it("requires a zone before searching and only shows assets from the selected zone", () => {
    render(<RequestAssetFields zones={zones} assets={assets}/>);
    const machine = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    expect(machine).toBeDisabled();

    fireEvent.change(screen.getByRole("combobox", { name: "Zone" }), { target: { value: "ash" } });
    const enabledMachine = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    expect(enabledMachine).toBeEnabled();
    fireEvent.change(enabledMachine, { target: { value: "a" } });
    expect(screen.getByRole("option", { name: /Ash Screw Sealing/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Fuel Picking Crane/ })).not.toBeInTheDocument();
  });

  it("clears the selected asset when the zone changes", () => {
    const { container } = render(<RequestAssetFields zones={zones} assets={assets}/>);
    const zone = screen.getByRole("combobox", { name: "Zone" });
    fireEvent.change(zone, { target: { value: "ash" } });
    fireEvent.focus(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" }));
    fireEvent.click(screen.getByRole("option", { name: /Ash Screw Sealing/ }));
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("a1");
    fireEvent.change(zone, { target: { value: "fuel" } });
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" })).toHaveValue("");
  });
});
