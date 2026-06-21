import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmDateFilterBar } from "./cm-date-filter-bar";

describe("CmDateFilterBar", () => {
  it("supports an unset dashboard-default state", () => {
    const { container } = render(
      <CmDateFilterBar initiallyUnset now={new Date("2026-06-18T17:30:00.000Z")} />,
    );

    expect(screen.getByRole("button", { name: /Default dashboard periods/i })).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="startDate"]')?.disabled).toBe(true);
  });

  it("shows one date range picker instead of separate date modes", () => {
    render(
      <CmDateFilterBar
        defaultEndDate="2026-06-19"
        defaultMode="range"
        defaultStartDate="2026-06-01"
      />,
    );

    expect(screen.getByRole("button", { name: /1 มิ\.ย\. 2569/ })).toBeTruthy();
    expect(screen.queryByLabelText("Date view")).toBeNull();
  });

  it("converts a legacy month filter into its complete date range", () => {
    render(<CmDateFilterBar defaultMode="month" defaultMonth="2026-02" />);

    expect(screen.getByRole("button", { name: /1 ก\.พ\. 2569 - 28 ก\.พ\. 2569/ })).toBeTruthy();
  });

  it("defaults to Bangkok month-to-date", () => {
    render(<CmDateFilterBar now={new Date("2026-06-18T17:30:00.000Z")} />);

    expect(screen.getByRole("button", { name: /1 มิ\.ย\. 2569 - 19 มิ\.ย\. 2569/ })).toBeTruthy();
  });
});
