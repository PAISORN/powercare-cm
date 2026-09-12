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
  it("searches Zone and only enables Assets from the selected result", () => {
    render(<RequestAssetFields zones={zones} assets={assets}/>);
    const machine = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    expect(machine).toBeDisabled();

    const zone = screen.getByRole("combobox", { name: "Zone" });
    fireEvent.change(zone, { target: { value: "ash" } });
    expect(screen.getByRole("option", { name: "ASH Handling" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Fuel preparation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "ASH Handling" }));

    const enabledMachine = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    expect(enabledMachine).toBeEnabled();
    fireEvent.change(enabledMachine, { target: { value: "ash" } });
    expect(screen.getByRole("option", { name: /Ash Screw/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Fuel Belt Conveyor/ })).not.toBeInTheDocument();
  });

  it("clears the selected Asset when a different Zone is selected", () => {
    const { container } = render(<RequestAssetFields zones={zones} assets={assets}/>);
    const zone = screen.getByRole("combobox", { name: "Zone" });
    fireEvent.focus(zone);
    fireEvent.click(screen.getByRole("option", { name: "ASH Handling" }));
    fireEvent.focus(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" }));
    fireEvent.click(screen.getByRole("option", { name: /Ash Screw/ }));
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("a1");

    fireEvent.change(zone, { target: { value: "fuel" } });
    fireEvent.click(screen.getByRole("option", { name: "Fuel preparation" }));
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" })).toHaveValue("");
  });

  it("requires selecting a Zone result instead of accepting unmatched text", () => {
    const { container } = render(<RequestAssetFields zones={zones} assets={assets}/>);
    fireEvent.change(screen.getByRole("combobox", { name: "Zone" }), { target: { value: "unknown" } });
    expect(container.querySelector('input[name="zoneId"]')).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" })).toBeDisabled();
    expect(screen.getByText("ไม่พบ Zone")).toBeInTheDocument();
  });
});
