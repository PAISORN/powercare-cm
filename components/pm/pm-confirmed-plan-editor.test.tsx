import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PmConfirmedPlanEditor } from "./pm-confirmed-plan-editor";

const base = { id: "plan", number: "PMP-SITE-20260815-001", plannedDateKey: "2026-08-20", status: "CONFIRMED", works: [{ id: "w", assetId: "old", status: "PLANNED" }] };
const props = { assets: [{ id: "a", code: "A-1", nameTh: "Pump" }], scope: { organizationId: "org", plantId: "site" }, actions: { addAsset: vi.fn(), reschedule: vi.fn(), cancel: vi.fn() } };
describe("confirmed PM plan editor", () => {
  it("exposes accessible manage-only actions with mandatory reasons", () => {
    render(<PmConfirmedPlanEditor {...props} plan={base} />);
    expect(screen.getByRole("combobox", { name: "Asset to add" })).toBeRequired(); expect(screen.getAllByRole("textbox")).toHaveLength(3); for (const input of screen.getAllByRole("textbox")) expect(input).toBeRequired();
    expect(screen.getByRole("button", { name: "เพิ่ม Asset" })).toBeEnabled(); expect(screen.getByRole("button", { name: "ย้ายวัน" })).toBeEnabled(); expect(screen.getByRole("button", { name: "ยกเลิกแผน" })).toBeEnabled();
  });
  it("disables whole-plan changes after work starts but still allows adding an Asset", () => {
    render(<PmConfirmedPlanEditor {...props} plan={{ ...base, works: [{ ...base.works[0], status: "IN_PROGRESS" }] }} />);
    expect(screen.getByRole("button", { name: "ย้ายวัน" })).toBeDisabled(); expect(screen.getByRole("button", { name: "ยกเลิกแผน" })).toBeDisabled(); expect(screen.getByRole("button", { name: "เพิ่ม Asset" })).toBeEnabled();
  });
});
