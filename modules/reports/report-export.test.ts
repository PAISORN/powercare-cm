import { describe, expect, it } from "vitest";
import { WorkStatus } from "../cm-work/cm-work-types";
import { toReportExportRow } from "./report-export";

describe("toReportExportRow", () => {
  it("formats the Excel row with Thai date and normalized related names", () => {
    const row = toReportExportRow({
      number: "CM-2026-06-0001",
      createdAt: new Date("2026-06-18T07:30:00.000Z"),
      closedAt: null,
      requesterName: "Somchai",
      requesterDepartment: "Operations",
      machineName: "Feed Pump",
      problemTitle: "High vibration",
      urgency: "URGENT",
      status: WorkStatus.IN_PROGRESS,
      category: { name: "Electrical" },
      zone: { name: "Boiler" },
      claimant: { fullName: "Technician A" },
      reviewer: null,
    });

    expect(row["วันที่แจ้ง"]).toBe("18/06/2569 14:30 น.");
    expect(row["ผู้รับงาน"]).toBe("Technician A");
    expect(row["ผู้ตรวจรับ"]).toBe("");
  });
});
