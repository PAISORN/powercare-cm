import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PmMonthlyPatternBuilder } from "./pm-monthly-pattern-builder";

const targets = [
  { id: "boiler", label: "Boiler System", active: true },
  { id: "turbine", label: "Steam Turbine", active: true },
];

function renderFields(patterns: Array<{ weekNumber: number; dayOfWeek: number; displayOrder: number; assetSystemId: string | null; zoneId: string | null }> = [], weeks: Array<{ weekNumber: number; mode: string }> = []) {
  render(<form data-testid="form"><PmMonthlyPatternBuilder initialWeek5Rule="NO_PM" patterns={patterns} pmBy="SYSTEM" targets={targets} weeks={weeks}/></form>);
  return () => new FormData(screen.getByTestId("form") as HTMLFormElement);
}

describe("PmMonthlyPatternFields", () => {
  it("distinguishes an unconfigured Week from an explicit No PM Week", () => {
    const formData = renderFields();
    expect(screen.getAllByText("ยังไม่ได้ตั้งค่า")).toHaveLength(4);
    fireEvent.click(screen.getAllByRole("button", { name: "No PM" })[0]);
    expect(formData().getAll("monthlyWeekMode")).toContain("1:NO_PM");
    expect(screen.getByText("ระบบจะไม่สร้าง PM สำหรับ Week 1")).toBeTruthy();
  });

  it("adds multiple targets to one weekday and submits deterministic Assignment values", () => {
    const formData = renderFields();
    fireEvent.click(screen.getByRole("button", { name: "เลือกที่ค้นหาทั้งหมด" }));
    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม 2 รายการไป Week 1" }));
    expect(formData().getAll("monthlyPattern")).toEqual(["1:1:0:boiler", "1:1:1:turbine"]);
  });

  it("filters targets and adds the selected item to another week and weekday", () => {
    const formData = renderFields();
    fireEvent.change(screen.getByRole("combobox", { name: "Destination week" }), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Assignment weekday" }), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search System" }), {
      target: { value: "Turbine" },
    });
    expect(screen.queryByText("Boiler System")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Steam Turbine" }));
    fireEvent.click(screen.getByRole("button", { name: "เพิ่ม 1 รายการไป Week 3" }));
    expect(formData().getAll("monthlyPattern")).toEqual(["3:5:0:turbine"]);
  });

  it("preserves saved occurrence, weekday, target, and Week 5 rule", () => {
    const formData = renderFields(
      [{ weekNumber: 2, dayOfWeek: 3, displayOrder: 0, assetSystemId: "boiler", zoneId: null }],
      [{ weekNumber: 1, mode: "NO_PM" }, { weekNumber: 2, mode: "ASSIGNMENTS" }, { weekNumber: 3, mode: "NO_PM" }, { weekNumber: 4, mode: "NO_PM" }],
    );
    expect(formData().getAll("monthlyPattern")).toEqual(["2:3:0:boiler"]);
    expect(formData().get("monthlyWeek5Rule")).toBe("NO_PM");
  });
});
