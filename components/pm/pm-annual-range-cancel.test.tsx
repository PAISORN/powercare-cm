import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PmAnnualRangeCancel } from "./pm-annual-range-cancel";

describe("PmAnnualRangeCancel", () => {
  it("selects affected schedules by default and allows exclusions in a blurred modal", () => {
    render(<PmAnnualRangeCancel action={vi.fn()} month={9} organizationId="org" planId="plan" plantId="site" schedules={[{id:"a",scheduleDateKey:"2026-09-01",label:"Boiler"},{id:"b",scheduleDateKey:"2026-09-05",label:"Turbine"}]} storageKey="pm" view="month" year={2026}/>);
    const start = screen.getAllByDisplayValue("2026-01-01")[0];
    const end = screen.getAllByDisplayValue("2026-12-31")[0];
    fireEvent.change(start, { target: { value: "2026-09-01" } });
    fireEvent.change(end, { target: { value: "2026-09-05" } });
    fireEvent.click(screen.getByRole("button", { name: /No-PM ช่วงวันที่/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("backdrop-blur-sm");
    const checks = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(checks).toHaveLength(2);
    expect(checks.every(box => box.checked)).toBe(true);
    fireEvent.click(checks[1]);
    expect(checks[1].checked).toBe(false);
    expect(screen.getByRole("button", { name: "ยืนยัน No-PM 1 รายการ" })).toBeTruthy();
  });
});
