import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssetSearchField } from "./asset-search-field";

const assets = [
  { id: "a1", code: "RTB-BFP-001", nameEn: "Boiler Feed Pump", nameTh: "ปั๊มน้ำป้อนหม้อไอน้ำ" },
  { id: "a2", code: "RTB-FCP-001", nameEn: "Fuel Picking Crane", nameTh: "" },
];

describe("AssetSearchField", () => {
  it("searches by code and selects an asset in the same machine-name field", () => {
    const { container } = render(<AssetSearchField assets={assets}/>);
    const input = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    fireEvent.change(input, { target: { value: "BFP" } });
    fireEvent.click(screen.getByRole("option", { name: /Boiler Feed Pump/ }));
    expect(input).toHaveValue("Boiler Feed Pump");
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("a1");
  });

  it("clears the asset link when the user edits the selected name", () => {
    const { container } = render(<AssetSearchField assets={assets}/>);
    const input = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: /Fuel Picking Crane/ }));
    fireEvent.change(input, { target: { value: "เครื่องจักรใหม่" } });
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("");
    expect(input).toHaveValue("เครื่องจักรใหม่");
  });

  it("supports keyboard selection", () => {
    const { container } = render(<AssetSearchField assets={assets}/>);
    const input = screen.getByRole("combobox", { name: "ชื่อเครื่องจักร" });
    fireEvent.change(input, { target: { value: "Fuel" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(container.querySelector('input[name="assetId"]')).toHaveValue("a2");
  });
});
