import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoreReportItemPicker } from "./store-report-item-picker";

const stores = [
  { id: "store-main", code: "MAIN", name: "Main Store" },
  { id: "store-electrical", code: "ELEC", name: "Electrical Store" },
];
const types = [
  { id: "type-chemical", code: "CHEM", name: "Chemical" },
  { id: "type-bearing", code: "BRG", name: "Bearing" },
];
const categories = [
  { id: "category-water", code: "WT", name: "Water Treatment" },
  { id: "category-mechanical", code: "MECH", name: "Mechanical" },
];
const materialGroups = [
  { id: "group-acid", categoryId: "category-water", code: "ACID", name: "Acid Chemicals" },
  { id: "group-bearing", categoryId: "category-mechanical", code: "BRG", name: "Bearings" },
];
const items = [
  {
    id: "chemical-1",
    code: "CH-001",
    itemCode: "CHEM-HCL-001",
    itemKind: "CHEMICAL",
    name: "Hydrochloric Acid",
    typeId: "type-chemical",
    categoryId: "category-water",
    materialGroupId: "group-acid",
    unit: "kg",
    minStock: 10,
    stocks: [{ storeId: "store-main", quantity: 20 }],
  },
  {
    id: "chemical-2",
    code: "CH-002",
    itemCode: "CHEM-NAOH-001",
    itemKind: "CHEMICAL",
    name: "Sodium Hydroxide",
    typeId: "type-chemical",
    categoryId: "category-water",
    materialGroupId: "group-acid",
    unit: "kg",
    minStock: 10,
    stocks: [{ storeId: "store-main", quantity: 5 }],
  },
  {
    id: "spare-1",
    code: "SP-001",
    itemCode: "BRG-001",
    itemKind: "SPARE_PART",
    name: "Bearing",
    typeId: "type-bearing",
    categoryId: "category-mechanical",
    materialGroupId: "group-bearing",
    unit: "ชิ้น",
    minStock: 2,
    stocks: [{ storeId: "store-electrical", quantity: 0 }],
  },
];

const props = { items, stores, types, categories, materialGroups, units: ["kg", "ชิ้น"] };

describe("StoreReportItemPicker", () => {
  it("lets the user tick multiple report items", () => {
    render(<StoreReportItemPicker {...props} />);

    const acid = screen.getByRole("checkbox", { name: /Hydrochloric Acid/ }) as HTMLInputElement;
    const caustic = screen.getByRole("checkbox", { name: /Sodium Hydroxide/ }) as HTMLInputElement;
    fireEvent.click(acid);
    fireEvent.click(caustic);

    expect(acid.checked).toBe(true);
    expect(caustic.checked).toBe(true);
    expect(acid.name).toBe("itemIds");
    expect(caustic.name).toBe("itemIds");
    expect(screen.getByText("เลือกแล้ว 2 รายการ")).toBeTruthy();
  });

  it("searches within filtered items and can select every visible result", () => {
    render(<StoreReportItemPicker {...props} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ค้นหารายการ" }), { target: { value: "CHEM" } });
    expect(screen.queryByText("Bearing")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เลือกผลค้นหาทั้งหมด" }));

    expect(screen.getAllByRole("checkbox").every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText("เลือกแล้ว 2 รายการ")).toBeTruthy();
  });

  it("updates the item list immediately when Stock filters change", () => {
    render(<StoreReportItemPicker {...props} />);

    fireEvent.change(screen.getByLabelText("ชนิดรายการ"), { target: { value: "CHEMICAL" } });
    expect(screen.queryByText("Bearing")).toBeNull();
    expect(screen.getByText("Hydrochloric Acid")).toBeTruthy();
    expect(screen.getByText("Sodium Hydroxide")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox", { name: /Hydrochloric Acid/ }));
    expect(screen.getByText("เลือกแล้ว 1 รายการ")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("สถานะสต็อก"), { target: { value: "nearMin" } });

    expect(screen.queryByText("Hydrochloric Acid")).toBeNull();
    expect(screen.getByText("Sodium Hydroxide")).toBeTruthy();
    expect(screen.getByText("เลือกแล้ว 0 รายการ")).toBeTruthy();
    expect(screen.getByText("แสดง 1 จาก 1 รายการ")).toBeTruthy();
  });
});