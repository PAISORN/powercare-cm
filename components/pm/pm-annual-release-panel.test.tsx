import { fireEvent, render, screen } from "@testing-library/react";
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
        users={[
          { id: "lead", fullName: "Lead Engineer", role: "ENGINEER" },
          { id: "helper", fullName: "PM Helper", role: "TECHNICIAN" },
        ]}
      />,
    );

    expect(screen.getAllByText(/Boiler/)).toHaveLength(2);
    expect((document.querySelector('input[name="releaseScheduleIds"]') as HTMLInputElement).value).toBe("s1");
    expect(screen.getByRole("button", { name: "เริ่ม PM" })).toBeTruthy();
    expect(screen.getByText("สร้าง PM Work สำหรับ Main Assets ทั้งหมดในรายการ")).toBeTruthy();
    expect(screen.getByText("21/09/2026")).toBeTruthy();
    expect(screen.getByLabelText("ยังไม่ได้เลือกทีม PM")).toBeTruthy();
    expect(document.querySelector("[data-pm-release-target-bar]")).toBeTruthy();
    expect(screen.queryByText(/ตรวจ Assets/)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มผู้ร่วม PM" }));
    expect(screen.getByRole("dialog", { name: "เลือกผู้ร่วม PM" })).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "ผู้รับผิดชอบหลัก" }), {
      target: { value: "lead" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /PM Helper/ }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันทีม PM" }));
    expect(screen.getByLabelText("ทีม PM Lead Engineer, PM Helper")).toBeTruthy();
    expect((document.querySelector('input[name="leadUserId"]') as HTMLInputElement).value).toBe("lead");
    expect((document.querySelector('input[name="collaboratorUserIds"]') as HTMLInputElement).value).toBe("helper");
  });

  it("automatically makes the first selected participant the lead", () => {
    render(
      <PmAnnualReleasePanel
        action={vi.fn()}
        organizationId="org"
        plantId="site"
        planId="annual"
        positionKey="pm-auto-lead"
        preview={{
          scheduleDateKey: "2026-09-21",
          schedules: [{ id: "s1", assetSystem: { code: "BLR", nameTh: "Boiler" } }],
          workload: { count: 1, threshold: 40, warning: false },
        }}
        users={[
          { id: "first", fullName: "First Technician", role: "TECHNICIAN" },
          { id: "second", fullName: "Second Technician", role: "TECHNICIAN" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "เพิ่มผู้ร่วม PM" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /First Technician/ }));
    expect(
      (screen.getByRole("combobox", { name: "ผู้รับผิดชอบหลัก" }) as HTMLSelectElement)
        .value,
    ).toBe("first");
    fireEvent.click(screen.getByRole("checkbox", { name: /Second Technician/ }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันทีม PM" }));

    expect((document.querySelector('input[name="leadUserId"]') as HTMLInputElement).value).toBe(
      "first",
    );
    expect(
      (document.querySelector('input[name="collaboratorUserIds"]') as HTMLInputElement).value,
    ).toBe("second");
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
