import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("uses an icon-only primary control", () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", { name: /mode$/i });
    expect(toggle.textContent).toBe("");
  });

  it("renders one circular control in compact navbar mode", () => {
    const { container } = render(<ThemeToggle compact />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByTestId("theme-toggle-compact").className).toContain("rounded-full");
    expect(screen.getByTestId("theme-toggle-compact").className).toContain("size-10");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
});
