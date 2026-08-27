import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { friendlyErrorMessage, SystemErrorPopup } from "./system-error-popup";

describe("system error popup", () => {
  it("converts technical errors into understandable Thai messages", () => {
    expect(friendlyErrorMessage("CM work not found")).toContain("ไม่พบข้อมูล");
    expect(friendlyErrorMessage("Permission denied")).toContain("ไม่มีสิทธิ์");
    expect(friendlyErrorMessage("invalid-count")).toContain("จำนวนรายการไม่ถูกต้อง");
    expect(friendlyErrorMessage("กรุณากรอกจำนวน")).toBe("กรุณากรอกจำนวน");
  });

  it("renders a blurred modal and lets the user close it", () => {
    const onClose = vi.fn();
    const { getByRole } = render(<SystemErrorPopup message="กรุณาตรวจสอบข้อมูล" onClose={onClose} />);

    const dialog = getByRole("alertdialog");
    expect(dialog.className).toContain("backdrop-blur-md");
    fireEvent.click(getByRole("button", { name: "ปิดและใช้งานต่อ" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<SystemErrorPopup message="เกิดข้อผิดพลาด" onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
