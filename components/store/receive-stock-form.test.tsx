import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReceiveStockForm } from "./receive-stock-form";

const stores = [
  { id: "store-main", code: "MAIN", name: "Main Store", categoryName: "Mechanical Store" },
  { id: "store-elec", code: "ELEC", name: "Electrical Store", categoryName: "Electrical Store" },
];

const spareParts = [
  {
    id: "bearing",
    code: "SP-RTB-00001",
    itemCode: "ACC-6208",
    name: "Bearing 6208",
    unit: "PCS",
    minStock: 5,
    typeName: "อะไหล่ทั่วไป",
    categoryName: "Mechanical",
    stocks: [{ storeId: "store-main", quantity: 12 }],
  },
  {
    id: "cable",
    code: "SP-RTB-00002",
    itemCode: "ACC-CABLE",
    name: "Cable THW",
    unit: "M",
    minStock: 10,
    typeName: "วัสดุสิ้นเปลือง",
    categoryName: "Electrical",
    stocks: [{ storeId: "store-elec", quantity: 2 }],
  },
];

describe("ReceiveStockForm", () => {
  it("filters spare parts immediately by search text", () => {
    render(
      <ReceiveStockForm
        action={vi.fn()}
        organizationId="org-1"
        plantId="plant-1"
        spareParts={spareParts}
        stores={stores}
      />,
    );

    expect(screen.getByText(/Bearing 6208/)).toBeTruthy();
    expect(screen.getByText(/Cable THW/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("ค้นหาอะไหล่สำหรับรับเข้า"), { target: { value: "ACC-6208" } });

    expect(screen.getByText(/Bearing 6208/)).toBeTruthy();
    expect(screen.queryByText(/Cable THW/)).toBeNull();
  });

  it("filters parts by store and stock status", () => {
    render(
      <ReceiveStockForm
        action={vi.fn()}
        organizationId="org-1"
        plantId="plant-1"
        spareParts={spareParts}
        stores={stores}
      />,
    );

    fireEvent.change(screen.getByLabelText("คลังอะไหล่"), { target: { value: "store-elec" } });
    fireEvent.change(screen.getByLabelText("สถานะสต็อก"), { target: { value: "LOW" } });

    expect(screen.getByText(/Cable THW/)).toBeTruthy();
    expect(screen.queryByText(/Bearing 6208/)).toBeNull();
  });
});
