import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IssueRequestForm } from "./issue-request-form";

const stocks = [
  {
    storeId: "store-main",
    sparePartId: "bearing",
    label: "SP-RTB-00001 / Bearing 6208 / Main Warehouse",
    available: 12,
    unit: "PCS",
    storeCode: "MAIN",
    storeName: "Main Warehouse",
    storeCategoryName: "Mechanical Store",
    sparePartCode: "SP-RTB-00001",
    sparePartName: "Bearing 6208",
    sparePartCategoryName: "Mechanical",
    itemCode: "ACC-6208",
    stockStatus: "ENOUGH" as const,
  },
  {
    storeId: "store-elec",
    sparePartId: "cable",
    label: "SP-RTB-00002 / Cable THW / Electrical Warehouse",
    available: 1,
    unit: "M",
    storeCode: "ELEC",
    storeName: "Electrical Warehouse",
    storeCategoryName: "Electrical Store",
    sparePartCode: "SP-RTB-00002",
    sparePartName: "Cable THW",
    sparePartCategoryName: "Electrical",
    itemCode: null,
    stockStatus: "LOW" as const,
  },
];

const issueZones = [
  { id: "zone-boiler", name: "Boiler", code: "01" },
  { id: "zone-turbine", name: "Turbine", code: "02" },
];

describe("IssueRequestForm", () => {
  it("locks CM work requests and uses the Site-level Applicable Zones at issue time", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    expect(container.querySelector('input[name="issueType"]')?.getAttribute("value")).toBe("CM_REFERENCED");
    expect(container.querySelector('input[name="cmWorkNumber"]')?.getAttribute("value")).toBe("CM-2026-07-0001");
    expect(screen.getByLabelText("Search spare parts")).toBeTruthy();

    fireEvent.change(container.querySelector('select[name="stockKey"]')!, {
      target: { value: "store-main:bearing" },
    });
    const zoneSelect = container.querySelector('select[name="zoneId"]') as HTMLSelectElement;
    expect(zoneSelect.disabled).toBe(false);
    expect([...zoneSelect.options].map((option) => option.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("01"), expect.stringContaining("02")]),
    );
  });

  it("filters stock choices by search text before requesting parts", () => {
    render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    expect(screen.getByText(/Bearing 6208/)).toBeTruthy();
    expect(screen.getByText(/Cable THW/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search spare parts"), { target: { value: "ACC-6208" } });

    expect(screen.getByText(/Bearing 6208/)).toBeTruthy();
    expect(screen.queryByText(/Cable THW/)).toBeNull();
  });

  it("collects public requester identity and exposes barcode scanning", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        inventoryCode="RTB"
        issueZones={issueZones}
        organizationId="org-1"
        plantId="plant-1"
        publicRequester={{ contactRequired: false }}
        stocks={stocks}
      />,
    );

    expect(container.querySelector('input[name="requesterName"]')).toBeTruthy();
    expect(container.querySelector('input[name="requesterDepartment"]')).toBeTruthy();
    expect(container.querySelector('input[name="requesterContact"]')?.hasAttribute("required")).toBe(false);
    expect(screen.getByRole("button", { name: "สแกนบาร์โค้ต" })).toBeTruthy();
  });
});
