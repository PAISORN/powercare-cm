import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PmConfirmPlanDialog } from "./pm-confirm-plan-dialog";

describe("PM confirm plan dialog", () => {
  it("shows immutable snapshot warning and submitted scope only after explicit confirmation", () => {
    render(<PmConfirmPlanDialog action={vi.fn()} eligibleAssetCount={4} emptyGroupCount={1} hiddenFields={[{ name: "planId", value: "plan-1" }, { name: "submissionKey", value: "once" }]} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันแผน PM" }));
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText(/Snapshot/)).toBeTruthy();
    expect(screen.getByText(/กลุ่มว่าง 1 กลุ่ม/)).toBeTruthy();
    expect(screen.getByDisplayValue("plan-1").getAttribute("name")).toBe("planId");
  });

  it("disables confirmation when no eligible Asset remains", () => {
    render(<PmConfirmPlanDialog action={vi.fn()} eligibleAssetCount={0} emptyGroupCount={2} hiddenFields={[]} />);
    expect((screen.getByRole("button", { name: "ยืนยันแผน PM" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("traps Tab in the modal, closes with Escape, and restores trigger focus", async () => {
    render(<PmConfirmPlanDialog action={vi.fn()} eligibleAssetCount={1} emptyGroupCount={0} hiddenFields={[]} />);
    const trigger = screen.getByRole("button", { name: "ยืนยันแผน PM" });
    fireEvent.click(trigger);
    const close = screen.getByRole("button", { name: "ปิดหน้าต่างยืนยัน" });
    const submit = screen.getByRole("button", { name: "ยืนยันและสร้างงาน" });
    await waitFor(() => expect(document.activeElement).toBe(close));
    close.focus(); fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(submit);
    submit.focus(); fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
