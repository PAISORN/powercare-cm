import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SparePartsMasterModal } from "./spare-parts-master-modal";

describe("SparePartsMasterModal", () => {
  it("opens in a blurred accessible dialog and closes with Escape", () => {
    render(
      <SparePartsMasterModal icon={<span>Icon</span>} subtitle="จัดการข้อมูล" title="คลังอะไหล่">
        <form><input aria-label="รหัสคลัง" /></form>
      </SparePartsMasterModal>,
    );

    const trigger = screen.getByRole("button", { name: /คลังอะไหล่/ });
    expect(trigger.className).toContain("bg-[var(--surface-raised)]");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "คลังอะไหล่" })).toBeTruthy();
    expect(document.querySelector("[data-spare-parts-modal-backdrop]")?.className).toContain("backdrop-blur-md");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes when a modal cancel control is clicked", () => {
    render(
      <SparePartsMasterModal icon={<span>Icon</span>} subtitle="สร้างรายการ" title="เพิ่มอะไหล่">
        <button data-spare-parts-modal-close type="button">ยกเลิก</button>
      </SparePartsMasterModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: /เพิ่มอะไหล่/ }));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
