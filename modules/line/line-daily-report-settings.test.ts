import {
  buildLineDailyReportMessage,
  defaultLineDailyReportTemplate,
  parseLineDailyReportTemplate,
} from "./line-daily-report-settings";

describe("LINE daily report settings", () => {
  it("keeps the default template focused on core daily report fields", () => {
    expect(defaultLineDailyReportTemplate).toMatchObject({
      showNewCount: true,
      showClosedCount: true,
      showNewList: true,
      showClosedList: true,
      showCategory: true,
      showZone: true,
      showMachineName: true,
      showProblemTitle: true,
      showRequester: false,
      showClaimant: false,
      showTimes: false,
      showCategorySummary: false,
      showZoneSummary: false,
    });
  });

  it("falls back to defaults when stored template JSON is invalid", () => {
    expect(parseLineDailyReportTemplate("{bad json")).toEqual(defaultLineDailyReportTemplate);
  });

  it("builds a concise report message using the selected visible fields", () => {
    const message = buildLineDailyReportMessage(
      {
        startDate: "2026-06-28",
        endDate: "2026-06-28",
        newCount: 1,
        closedCount: 1,
        newWorks: [
          {
            cmNumber: "CM-2026-06-0001",
            machineName: "Cooling pump",
            problemTitle: "Pump vibration",
            requesterName: "Operator A",
            createdAt: new Date("2026-06-28T01:00:00.000Z"),
            category: { name: "งานเครื่องกล" },
            zone: { name: "Cooling Tower" },
            claimant: { fullName: "Mechanical Technician" },
          },
        ],
        closedWorks: [
          {
            cmNumber: "CM-2026-06-0002",
            machineName: "Lighting panel",
            problemTitle: "Breaker trip",
            requesterName: "Operator B",
            closedAt: new Date("2026-06-28T04:00:00.000Z"),
            category: { name: "งานไฟฟ้า" },
            zone: { name: "Office" },
            claimant: { fullName: "Electrical Technician" },
          },
        ],
      },
      { ...defaultLineDailyReportTemplate, showRequester: true, showClaimant: false, showTimes: false },
    );

    expect(message).toContain("แจ้งใหม่: 1 งาน");
    expect(message).toContain("ปิดงาน: 1 งาน");
    expect(message).toContain("CM-2026-06-0001");
    expect(message).toContain("ประเภท: งานเครื่องกล");
    expect(message).toContain("โซน: Cooling Tower");
    expect(message).toContain("เครื่องจักร: Cooling pump");
    expect(message).toContain("ผู้แจ้ง: Operator A");
    expect(message).not.toContain("ผู้รับงาน: Mechanical Technician");
    expect(message).not.toContain("เวลา:");
  });
});
