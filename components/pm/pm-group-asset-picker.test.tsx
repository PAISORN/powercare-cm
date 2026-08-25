import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PmGroupAssetPicker } from "./pm-group-asset-picker";

const assets = [
  { id: "a1", code: "P-001", nameTh: "ปั๊มน้ำ", nameEn: "Water Pump", typeName: "Pump", zoneName: "Boiler", operatingStatus: "IN_SERVICE" },
  { id: "a2", code: "M-002", nameTh: "มอเตอร์", nameEn: "Motor", typeName: "Motor", zoneName: "Turbine", operatingStatus: "UNDER_REPAIR" },
];

describe("PmGroupAssetPicker", () => {
  it("searches across Asset metadata", () => {
    render(<PmGroupAssetPicker assets={assets} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Assets" }), { target: { value: "Boiler" } });
    expect(screen.getByRole("checkbox", { name: /Water Pump/ })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Motor/ })).not.toBeInTheDocument();
  });

  it("posts every selected Asset id and supports toggling with the keyboard", () => {
    const { container } = render(<PmGroupAssetPicker assets={assets} defaultSelectedIds={["a1"]} />);
    const motor = screen.getByRole("checkbox", { name: /Motor/ });
    motor.focus();
    fireEvent.keyDown(motor, { key: " " });
    fireEvent.click(motor);
    expect(container.querySelectorAll('input[name="assetIds"]')).toHaveLength(2);
    expect(screen.getByText(/2 selected/)).toBeInTheDocument();
  });

  it("keeps selected Asset ids submitted when search filters their checkboxes out", () => {
    const { container } = render(<PmGroupAssetPicker assets={assets} defaultSelectedIds={["a1", "a2"]} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Assets" }), { target: { value: "Boiler" } });
    expect(screen.queryByRole("checkbox", { name: /Motor/ })).not.toBeInTheDocument();
    expect(Array.from(container.querySelectorAll<HTMLInputElement>('input[name="assetIds"]')).map((input) => input.value).sort()).toEqual(["a1", "a2"]);
  });

  it("keeps an empty selection valid and reports no search results", () => {
    render(<PmGroupAssetPicker assets={assets} />);
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search Assets" }), { target: { value: "missing" } });
    expect(screen.getByText("No Assets match this search.")).toBeInTheDocument();
  });

  it("shows an unavailable current member and lets it be removed without allowing re-selection", () => {
    const stale = { id: "stale", code: "OLD-1", nameTh: "Old Asset", nameEn: null, typeName: "Pump", zoneName: "Boiler", operatingStatus: "RETIRED" };
    const { container } = render(<PmGroupAssetPicker assets={assets} defaultSelectedIds={["a1", "stale"]} staleAssets={[stale]} />);

    expect(screen.getByText("Unavailable current members")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(Array.from(container.querySelectorAll<HTMLInputElement>('input[name="assetIds"]')).map((input) => input.value)).toEqual(["a1"]);
    expect(screen.getByRole("button", { name: "Removed" })).toBeDisabled();
    expect(screen.queryByRole("checkbox", { name: /Old Asset/ })).not.toBeInTheDocument();
  });
});
