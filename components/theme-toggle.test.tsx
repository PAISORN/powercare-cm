import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("uses an icon-only primary control", () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole("button", { name: /mode$/i });
    expect(toggle.textContent).toBe("");
  });
});
