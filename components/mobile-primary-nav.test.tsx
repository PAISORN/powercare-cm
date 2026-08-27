import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobilePrimaryNav } from "./mobile-primary-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboardcm",
}));

describe("MobilePrimaryNav", () => {
  it("temporarily hides the activities tab while keeping the remaining primary actions", () => {
    render(<MobilePrimaryNav />);

    expect(screen.queryByRole("link", { name: "งาน" })).toBeNull();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "แจ้งซ่อม" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Store" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "โปรไฟล์" })).toBeTruthy();
  });
});