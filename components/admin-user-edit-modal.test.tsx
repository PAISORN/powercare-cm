import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AdminUserEditModal } from "./admin-user-edit-modal";

describe("AdminUserEditModal", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1420 });
  });

  it("opens as an accessible blurred modal and closes without changing scroll", () => {
    render(
      <AdminUserEditModal fullName="Test User" storageKey="admin-users:list" targetId="user-1" username="test">
        <form><input aria-label="Username" /></form>
      </AdminUserEditModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "ดูรายละเอียด / แก้ไข" }));
    expect(screen.getByRole("dialog", { name: "แก้ไขผู้ใช้ Test User" })).toBeTruthy();
    expect(document.querySelector("[data-admin-user-edit-backdrop]")?.className).toContain("backdrop-blur-md");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.scrollY).toBe(1420);
    expect(document.body.style.overflow).toBe("");
  });

  it("stores the list position before submitting an edit", () => {
    render(
      <AdminUserEditModal fullName="Test User" storageKey="admin-users:list" targetId="user-1" username="test">
        <form><button type="submit">Save</button></form>
      </AdminUserEditModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "ดูรายละเอียด / แก้ไข" }));
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);

    expect(JSON.parse(window.sessionStorage.getItem("powercare:list-position:admin-users:list") ?? "null")).toMatchObject({
      scrollY: 1420,
      targetId: "user-1",
    });
  });
});