import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PmAnnualReleasePanel } from "./pm-annual-release-panel";

describe("PmAnnualReleasePanel", () => {
  it("shows a simple all-assets release confirmation without per-asset controls", () => {
    render(
      <PmAnnualReleasePanel
        action={vi.fn()}
        organizationId="org"
        plantId="site"
        planId="annual"
        positionKey="pm"
        preview={{
          scheduleDateKey: "2026-09-21",
          schedules: [{ id: "s1", assetSystem: { code: "BLR", nameTh: "Boiler" } }],
          workload: { count: 1, threshold: 40, warning: false },
        }}
      />,
    );

    expect(screen.getAllByText(/Boiler/)).toHaveLength(2);
    expect((document.querySelector('input[name="releaseScheduleIds"]') as HTMLInputElement).value).toBe("s1");
    expect(screen.getByRole("button", { name: "เริ่ม PM" })).toBeTruthy();
    expect(screen.getByText("สร้าง PM Work สำหรับ Main Assets ทั้งหมดในรายการ")).toBeTruthy();
    expect(screen.getByText("21/09/2026")).toBeTruthy();
    expect(document.querySelector("[data-pm-release-target-bar]")).toBeTruthy();
    expect(screen.queryByText(/ตรวจ Assets/)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("warns before start when the Annual PM Plan will be activated", () => {
    render(
      <PmAnnualReleasePanel
        activatesDraft
        action={vi.fn()}
        organizationId="org"
        plantId="site"
        planId="annual"
        positionKey="pm"
        preview={{
          scheduleDateKey: "2026-09-21",
          schedules: [{ id: "s1", zone: { name: "Water" } }],
          workload: { count: 0, threshold: 40, warning: false },
        }}
      />,
    );

    expect(screen.getByText(/Activate แผนก่อนสร้าง PM Work/)).toBeTruthy();
  });
});
