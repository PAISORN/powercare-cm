import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilterBar } from "./filter-bar";

describe("FilterBar date range", () => {
  it("uses the shared date range picker instead of a native month input", () => {
    const { container } = render(
      <FilterBar
        categories={[]}
        claimants={[]}
        values={{ mode: "range", startDate: "2026-01-01", endDate: "2026-01-31" }}
        zones={[]}
      />,
    );

    expect(container.querySelector('input[name="mode"]')?.getAttribute("value")).toBe("range");
    expect(container.querySelector('input[name="startDate"]')?.getAttribute("value")).toBe("2026-01-01");
    expect(container.querySelector('input[name="endDate"]')?.getAttribute("value")).toBe("2026-01-31");
    expect(container.querySelector('input[type="month"]')).toBeNull();
  });

  it("supports the same unset default period shown on the dashboard", () => {
    const { container } = render(
      <FilterBar
        categories={[]}
        claimants={[]}
        initiallyUnset
        values={{}}
        zones={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /Default dashboard periods/i })).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="startDate"]')?.disabled).toBe(true);
  });
});
