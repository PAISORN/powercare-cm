import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoreReportItemPicker } from "./store-report-item-picker";

const items = [
  { id: "chemical-1", code: "CH-001", itemCode: "CHEM-HCL-001", itemKind: "CHEMICAL", name: "Hydrochloric Acid" },
  { id: "chemical-2", code: "CH-002", itemCode: "CHEM-NAOH-001", itemKind: "CHEMICAL", name: "Sodium Hydroxide" },
  { id: "spare-1", code: "SP-001", itemCode: "BRG-001", itemKind: "SPARE_PART", name: "Bearing" },
];

describe("StoreReportItemPicker", () => {
  it("lets the user tick multiple report items", () => {
    render(<StoreReportItemPicker items={items} />);

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

  it("searches items and can select every visible result", () => {
    render(<StoreReportItemPicker items={items} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ค้นหารายการ" }), { target: { value: "CHEM" } });
    expect(screen.queryByText("Bearing")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เลือกผลค้นหาทั้งหมด" }));

    expect(screen.getAllByRole("checkbox").every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText("เลือกแล้ว 2 รายการ")).toBeTruthy();
  });
});
