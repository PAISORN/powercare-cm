import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IssueRequestForm } from "./issue-request-form";

const stocks = [
  {
    storeId: "store-main",
    sparePartId: "bearing",
    label: "SP-RTB-00001 · Bearing 6208 · Main Warehouse",
    available: 12,
    unit: "PCS",
    storeCode: "MAIN",
    storeName: "Main Warehouse",
    storeCategoryName: "Mechanical Store",
    sparePartCode: "SP-RTB-00001",
    sparePartName: "Bearing 6208",
    sparePartCategoryName: "Mechanical",
    itemCode: "ACC-6208",
    zoneNames: ["Boiler"],
    stockStatus: "ENOUGH" as const,
  },
  {
    storeId: "store-elec",
    sparePartId: "cable",
    label: "SP-RTB-00002 · Cable THW · Electrical Warehouse",
    available: 1,
    unit: "M",
    storeCode: "ELEC",
    storeName: "Electrical Warehouse",
    storeCategoryName: "Electrical Store",
    sparePartCode: "SP-RTB-00002",
    sparePartName: "Cable THW",
    sparePartCategoryName: "Electrical",
    itemCode: null,
    zoneNames: ["Turbine"],
    stockStatus: "LOW" as const,
  },
];

describe("IssueRequestForm", () => {
  it("locks CM work requests from the work detail page and shows spare part filters", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }]}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    expect(screen.getByText("Store Request สำหรับงานนี้")).toBeTruthy();
    expect(screen.queryByText("ประเภทการเบิก")).toBeNull();
    expect(screen.queryByText("เลขที่ CM ภายใน Site")).toBeNull();
    expect(container.querySelector('input[name="issueType"]')?.getAttribute("value")).toBe("CM_REFERENCED");
    expect(container.querySelector('input[name="cmWorkNumber"]')?.getAttribute("value")).toBe("CM-2026-07-0001");

    for (const label of ["คลังอะไหล่", "ประเภท", "หมวดหมู่", "หน่วยนับ", "Zone", "สถานะสต๊อก"]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it("filters stock choices by search text before requesting parts", () => {
    render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
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
});
