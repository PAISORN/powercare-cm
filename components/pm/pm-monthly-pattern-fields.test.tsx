import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("collapses Week details without losing assignments submitted by the form", () => {
    const formData = renderFields([{ weekNumber: 2, dayOfWeek: 3, displayOrder: 0, assetSystemId: "boiler", zoneId: null }]);
    const toggle = screen.getByRole("button", { name: "รายการ Week 2" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(formData().getAll("monthlyPattern")).toEqual(["2:3:0:boiler"]);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(formData().getAll("monthlyPattern")).toEqual(["2:3:0:boiler"]);
  });
  it("adds an independent Week 5 baseline and can switch back to legacy Repeat Week 1", () => {
    const formData = renderFields();
    const weekFive = screen.getByRole("region", { name: "Pattern Week 5" });
    expect(formData().getAll("monthlyWeekMode")).toContain("5:NO_PM");
    fireEvent.click(within(weekFive).getByRole("button", { name: "เพิ่ม PM ใน Week 5" }));
    fireEvent.click(within(weekFive).getByRole("checkbox", { name: "Boiler System" }));
    fireEvent.click(within(weekFive).getByRole("button", { name: "เพิ่ม 1 รายการใน Week 5" }));
    expect(formData().getAll("monthlyPattern")).toEqual(["5:1:0:boiler"]);
    expect(formData().getAll("monthlyWeekMode")).toContain("5:ASSIGNMENTS");
    fireEvent.click(within(weekFive).getByRole("button", { name: "ตาม Week 1" }));
    expect(formData().getAll("monthlyPattern")).toEqual([]);
    expect(formData().getAll("monthlyWeekMode")).not.toContain("5:ASSIGNMENTS");
    expect(formData().get("monthlyWeek5Rule")).toBe("REPEAT_WEEK_1");
  });
  it("adds and removes PM directly inside the selected Week card without using the top composer", () => {
    const formData = renderFields();
    const weekTwo = screen.getByRole("region", { name: "Pattern Week 2" });
    fireEvent.click(within(weekTwo).getByRole("button", { name: "เพิ่ม PM ใน Week 2" }));
    fireEvent.change(within(weekTwo).getByLabelText("วันเพิ่ม PM Week 2"), { target: { value: "3" } });
    fireEvent.click(within(weekTwo).getByRole("checkbox", { name: "Boiler System" }));
    fireEvent.click(within(weekTwo).getByRole("checkbox", { name: "Steam Turbine" }));
    fireEvent.click(within(weekTwo).getByRole("button", { name: "เพิ่ม 2 รายการใน Week 2" }));
    expect(formData().getAll("monthlyPattern")).toEqual(["2:3:0:boiler", "2:3:1:turbine"]);
    expect((screen.getByRole("combobox", { name: "Destination week" }) as HTMLSelectElement).value).toBe("1");
    expect(within(weekTwo).queryByRole("checkbox", { name: "Boiler System" })).toBeNull();
    fireEvent.click(within(weekTwo).getByRole("button", { name: "Remove Boiler System" }));
    expect(formData().getAll("monthlyPattern")).toEqual(["2:3:0:turbine"]);
    expect(within(weekTwo).getByRole("checkbox", { name: "Boiler System" })).toBeTruthy();
  });

  it("changes a target in place and prevents duplicate targets on the same weekday", () => {
    const formData = renderFields([
      { weekNumber: 1, dayOfWeek: 1, displayOrder: 0, assetSystemId: "boiler", zoneId: null },
      { weekNumber: 1, dayOfWeek: 1, displayOrder: 1, assetSystemId: "turbine", zoneId: null },
    ]);
    fireEvent.change(screen.getByLabelText("เปลี่ยนเป้าหมาย Boiler System Week 1 ลำดับ 1"), { target: { value: "turbine" } });
    expect(formData().getAll("monthlyPattern")).toEqual(["1:1:0:boiler", "1:1:1:turbine"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Steam Turbine" }));
    fireEvent.change(screen.getByLabelText("เปลี่ยนเป้าหมาย Boiler System Week 1 ลำดับ 1"), { target: { value: "turbine" } });
    expect(formData().getAll("monthlyPattern")).toEqual(["1:1:0:turbine"]);
  });
  it("opens direct entry on a No PM card without changing other Weeks", () => {
    const formData = renderFields([], [1, 2, 3, 4].map(weekNumber => ({ weekNumber, mode: "NO_PM" })));
    const weekThree = screen.getByRole("region", { name: "Pattern Week 3" });
    fireEvent.click(within(weekThree).getByRole("button", { name: "เพิ่ม PM ใน Week 3" }));
    expect(formData().getAll("monthlyWeekMode")).toEqual(["1:NO_PM", "2:NO_PM", "3:ASSIGNMENTS", "4:NO_PM", "5:NO_PM"]);
    expect(within(weekThree).getByLabelText("วันเพิ่ม PM Week 3")).toBeTruthy();
  });
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
