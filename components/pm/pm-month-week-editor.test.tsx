import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PmMonthWeekEditor } from "./pm-month-week-editor";

afterEach(cleanup);
const props = {
  year: 2027, month: 3, weekNumber: 5, rows: [], revision: "[]", open: true,
  targets: [{ id: "sys", label: "Boiler", active: true }, { id: "old", label: "Inactive", active: false }],
  today: "2026-10-17", effectiveDate: "2027-01-01", active: false, positionKey: "week-test",
  hidden: { planId: "plan", month: "3" }, action: vi.fn(),
};
describe("dated Week editor", () => {
  it("adds and removes a Week 5 assignment directly without any baseline fields", () => {
    const { container } = render(<PmMonthWeekEditor {...props} />);
    fireEvent.change(screen.getByLabelText("เลือกเป้าหมาย Week 5"), { target: { value: "sys" } });
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มรายการใน Week 5" }));
    const form = container.querySelector("form")!;
    expect(JSON.parse(String(new FormData(form).get("weekEntries")))).toEqual([{ dayOfWeek: 1, targetId: "sys" }]);
    expect(new FormData(form).has("monthlyPattern")).toBe(false);
    expect(new FormData(form).has("monthlyWeekMode")).toBe(false);
    expect(screen.queryByRole("option", { name: "Inactive" })).toBeNull();
    expect(screen.getByLabelText("เลือกวันที่ Week 5").children).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "ลบ Boiler" }));
    expect(new FormData(form).get("weekEntries")).toBe("[]");
  });
  it("locks issued work and disables unavailable dates and empty fifth weeks", () => {
    render(<PmMonthWeekEditor {...props} month={2} rows={[{ id: "issued", scheduleDateKey: "2027-02-28", targetId: "sys", label: "Boiler", locked: true, source: "PATTERN" }]} />);
    expect(screen.getByText("ไม่มีวันที่แก้ไขได้ใน Week นี้")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ลบ Boiler" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByRole("button", { name: "บันทึกเฉพาะ Week 5" })).toBeNull();
  });
  it("requires a reason for Active edits", () => {
    render(<PmMonthWeekEditor {...props} active />);
    expect(screen.getByLabelText("เหตุผลที่แก้ไข Week นี้").hasAttribute("required")).toBe(true);
  });
});
