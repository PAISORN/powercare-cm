import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequestAssetFields } from "./request-asset-fields";

const zones = [{ id: "ash", name: "ASH Handling" }, { id: "fuel", name: "Fuel preparation" }];
const assets = [
  { id: "a1", code: "MA-ASH-001", nameEn: "Ash Screw", nameTh: "", zoneId: "ash" },
  { id: "a2", code: "MA-FBC-001", nameEn: "Fuel Belt Conveyor", nameTh: "", zoneId: "fuel" },
];

describe("RequestAssetFields", () => {
  it("uses a Zone/Area dropdown and only enables Assets from the selected option", () => {
    render(<RequestAssetFields zones={zones} assets={assets}/>);
    const zone = screen.getByRole("combobox", { name: "Zone/Area" });
    const machine = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });

    expect(zone).toHaveValue("");
    expect(screen.getByRole("option", { name: "เลือก Zone/Area" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ASH Handling" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fuel preparation" })).toBeInTheDocument();
    expect(machine).toBeDisabled();

    fireEvent.change(zone, { target: { value: "ash" } });
    const enabledMachine = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    expect(enabledMachine).toBeEnabled();
    fireEvent.change(enabledMachine, { target: { value: "ash" } });
    expect(screen.getByRole("option", { name: /Ash Screw/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Fuel Belt Conveyor/ })).not.toBeInTheDocument();
  });

  it("clears the selected Asset when the Zone/Area dropdown changes", () => {
    const { container } = render(<RequestAssetFields zones={zones} assets={assets}/>);
    const zone = screen.getByRole("combobox", { name: "Zone/Area" });
    fireEvent.change(zone, { target: { value: "ash" } });
    fireEvent.focus(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" }));
    fireEvent.click(screen.getByRole("option", { name: /Ash Screw/ }));
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("a1");

    fireEvent.change(zone, { target: { value: "fuel" } });
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" })).toHaveValue("");
  });
});
