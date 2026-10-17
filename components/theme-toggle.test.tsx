import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";
const { saveTheme } = vi.hoisted(() => ({ saveTheme: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("../app/settings/actions", () => ({ saveDisplayPreferences: saveTheme }));
afterEach(() => { delete document.documentElement.dataset.preferenceUser; vi.clearAllMocks(); });

describe("ThemeToggle", () => {
  it("tracks external theme changes and saves only the current account theme", async () => {
    document.documentElement.dataset.theme = "day";
    document.documentElement.dataset.preferenceUser = "account-A";
    render(<ThemeToggle compact />);
    document.documentElement.dataset.theme = "night";
    await waitFor(() => expect(screen.getByRole("button", { name: "Night mode" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Night mode" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("day"));
    expect(saveTheme).toHaveBeenCalledWith({ theme: "day" }, "account-A");
  });
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
