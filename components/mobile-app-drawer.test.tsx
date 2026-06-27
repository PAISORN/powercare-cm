import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileAppDrawer } from "./mobile-app-drawer";

describe("MobileAppDrawer", () => {
  it("opens from the menu button and closes from the overlay", () => {
    render(<MobileAppDrawer userName="Electrical Technician" role="TECHNICIAN" categoryName="งานไฟฟ้า" unreadCount={0} />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog", { name: "Application menu" });
    expect(dialog).toBeTruthy();
    expect(dialog.className).toContain("fixed inset-0");
    expect(dialog.className).toContain("w-screen");
    expect(dialog.className).toContain("sm:w-[86vw]");
    expect(dialog.className).toContain("sm:max-w-[340px]");
    const navigation = screen.getByTestId("mobile-drawer-nav");
    expect(navigation.className).toContain("min-h-0");
    expect(navigation.className).toContain("flex-1");
    expect(navigation.className).toContain("overflow-y-auto");

    fireEvent.click(screen.getByTestId("drawer-overlay"));
    expect(screen.queryByRole("dialog", { name: "Application menu" })).toBeNull();
  });
});
