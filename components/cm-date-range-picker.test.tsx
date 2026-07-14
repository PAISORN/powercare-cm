import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmDateRangePicker } from "./cm-date-range-picker";

describe("CmDateRangePicker", () => {
  it("keeps dashboard date fields unset until the user applies a range", () => {
    const { container } = render(
      <CmDateRangePicker
        defaultEndDate="2026-06-19"
        defaultStartDate="2026-06-01"
        initiallyUnset
      />,
    );

    expect(screen.getByRole("button", { name: /Default dashboard periods/i })).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="mode"]')?.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Default dashboard periods/i }));
    const dialogButtons = screen.getByRole("dialog").querySelectorAll("button");
    fireEvent.click(dialogButtons[dialogButtons.length - 1]);

    expect(container.querySelector<HTMLInputElement>('input[name="mode"]')?.disabled).toBe(false);
  });

  it("opens an accessible date range dialog from the trigger", () => {
    render(
      <CmDateRangePicker
        defaultEndDate="2026-06-19"
        defaultStartDate="2026-06-01"
        now={new Date("2026-06-18T17:30:00.000Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ }));

    expect(screen.getByRole("dialog", { name: "เลือกช่วงวันที่" })).toBeTruthy();
  });

  it("renders the calendar popup in the compact 75 percent size", () => {
    render(
      <CmDateRangePicker
        defaultEndDate="2026-06-19"
        defaultStartDate="2026-06-01"
        now={new Date("2026-06-18T17:30:00.000Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ }));

    expect(screen.getByRole("dialog").className).toContain("cm-date-picker-popover");
    expect(screen.getByRole("dialog").className).toContain("w-[min(315px,calc(100vw-2rem))]");
  });

  it("keeps a calendar selection as a draft until the user applies it", () => {
    const { container } = render(
      <CmDateRangePicker
        defaultEndDate="2026-06-19"
        defaultStartDate="2026-06-01"
        now={new Date("2026-06-18T17:30:00.000Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ }));
    fireEvent.click(screen.getByRole("button", { name: "13 มิถุนายน 2569" }));

    expect((screen.getByLabelText("วันเริ่มต้น") as HTMLInputElement).value).toBe("13 มิ.ย. 2569");
    expect((container.querySelector('input[name="startDate"]') as HTMLInputElement).value).toBe("2026-06-01");

    fireEvent.click(screen.getByRole("button", { name: "ใช้ช่วงวันที่" }));

    expect((container.querySelector('input[name="startDate"]') as HTMLInputElement).value).toBe("2026-06-13");
  });

  it("selects an inclusive custom range from the calendar", () => {
    render(
      <CmDateRangePicker
        defaultEndDate="2026-06-19"
        defaultStartDate="2026-06-01"
        now={new Date("2026-06-18T17:30:00.000Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ }));
    fireEvent.click(screen.getByRole("button", { name: "5 มิถุนายน 2569" }));
    fireEvent.click(screen.getByRole("button", { name: "12 มิถุนายน 2569" }));

    expect((screen.getByLabelText("วันเริ่มต้น") as HTMLInputElement).value).toBe("5 มิ.ย. 2569");
    expect((screen.getByLabelText("วันสิ้นสุด") as HTMLInputElement).value).toBe("12 มิ.ย. 2569");
  });

  it("shows one month and selects a range across different months", () => {
    const { container } = render(
      <CmDateRangePicker
        defaultEndDate="2026-01-01"
        defaultStartDate="2026-01-01"
        now={new Date("2026-01-01T01:00:00.000Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1 ม\.ค\. 2569 - 1 ม\.ค\. 2569/ }));

    expect(screen.getAllByText("มกราคม 2569")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "7 วันล่าสุด" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "1 มกราคม 2569" }));
    fireEvent.click(screen.getByRole("button", { name: "เดือนถัดไป" }));
    fireEvent.click(screen.getByRole("button", { name: "เดือนถัดไป" }));
    fireEvent.click(screen.getByRole("button", { name: "27 มีนาคม 2569" }));

    const inRangeDate = screen.getByRole("button", { name: "15 มีนาคม 2569" });
    expect(inRangeDate.className).toContain("font-semibold");
    expect(inRangeDate.className).toContain("text-[var(--calendar-range-ink)]");
    expect(inRangeDate.className).not.toContain("opacity-40");

    fireEvent.click(screen.getByRole("button", { name: "ใช้ช่วงวันที่" }));

    expect((container.querySelector('input[name="startDate"]') as HTMLInputElement).value).toBe("2026-01-01");
    expect((container.querySelector('input[name="endDate"]') as HTMLInputElement).value).toBe("2026-03-27");
  });

  it("discards draft changes on cancel and closes on Escape", () => {
    render(
      <CmDateRangePicker
        defaultEndDate="2026-06-19"
        defaultStartDate="2026-06-01"
        now={new Date("2026-06-18T17:30:00.000Z")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ }));
    fireEvent.click(screen.getByRole("button", { name: "13 มิถุนายน 2569" }));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    fireEvent.click(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ }));

    expect((screen.getByLabelText("วันเริ่มต้น") as HTMLInputElement).value).toBe("1 มิ.ย. 2569");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "เลือกช่วงวันที่" })).toBeNull();
  });
});
