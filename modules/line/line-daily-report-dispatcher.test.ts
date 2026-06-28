import { describe, expect, it, vi } from "vitest";
import {
  buildLineDailyReportEventId,
  createLineDailyReportDispatcher,
  resolveLineDailyReportDate,
} from "./line-daily-report-dispatcher";
import { defaultLineDailyReportTemplate, serializeLineDailyReportTemplate } from "./line-daily-report-settings";

function enabledSetting(overrides = {}) {
  return {
    enabled: true,
    destinationId: "destination-1",
    sendTime: "08:00",
    dateMode: "YESTERDAY",
    templateJson: serializeLineDailyReportTemplate(defaultLineDailyReportTemplate),
    destination: {
      id: "destination-1",
      targetId: "group-1",
      displayName: "CM group",
      active: true,
      categoryId: "mechanical",
    },
    ...overrides,
  };
}

const report = {
  startDate: "2026-06-27",
  endDate: "2026-06-27",
  newCount: 1,
  closedCount: 0,
  newWorks: [
    {
      cmNumber: "CM-2026-06-0001",
      machineName: "Cooling pump",
      problemTitle: "Pump vibration",
      requesterName: "Operator A",
      createdAt: new Date("2026-06-27T01:00:00.000Z"),
      category: { name: "งานเครื่องกล" },
      zone: { name: "Cooling Tower" },
      claimant: null,
    },
  ],
  closedWorks: [],
};

describe("LINE daily report dispatcher", () => {
  it("uses Bangkok calendar dates for yesterday reports", () => {
    expect(resolveLineDailyReportDate("YESTERDAY", new Date("2026-06-28T01:00:00.000Z"))).toBe("2026-06-27");
    expect(resolveLineDailyReportDate("TODAY", new Date("2026-06-28T01:00:00.000Z"))).toBe("2026-06-28");
  });

  it("skips sending when the setting is disabled", async () => {
    const deliver = vi.fn();
    const dispatcher = createLineDailyReportDispatcher({
      getSetting: vi.fn().mockResolvedValue(enabledSetting({ enabled: false })),
      queryReport: vi.fn().mockResolvedValue(report),
      deliver,
    });

    await expect(dispatcher.dispatch({ now: new Date("2026-06-28T01:00:00.000Z") })).resolves.toMatchObject({
      status: "SKIPPED",
      reason: "DISABLED",
    });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("sends the selected report to the configured destination at the configured Bangkok time", async () => {
    const deliver = vi.fn().mockResolvedValue(undefined);
    const queryReport = vi.fn().mockResolvedValue(report);
    const dispatcher = createLineDailyReportDispatcher({
      getSetting: vi.fn().mockResolvedValue(enabledSetting()),
      queryReport,
      deliver,
    });

    await expect(dispatcher.dispatch({ now: new Date("2026-06-28T01:00:00.000Z") })).resolves.toMatchObject({
      status: "SENT",
      date: "2026-06-27",
    });
    expect(queryReport).toHaveBeenCalledWith({ date: "2026-06-27", categoryId: "mechanical" });
    expect(deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: buildLineDailyReportEventId("2026-06-27", "destination-1"),
        destinationId: "destination-1",
        targetId: "group-1",
        text: expect.stringContaining("แจ้งใหม่: 1 งาน"),
      }),
    );
  });

  it("skips when the cron runs outside the configured Bangkok time unless forced", async () => {
    const deliver = vi.fn().mockResolvedValue(undefined);
    const dispatcher = createLineDailyReportDispatcher({
      getSetting: vi.fn().mockResolvedValue(enabledSetting()),
      queryReport: vi.fn().mockResolvedValue(report),
      deliver,
    });

    await expect(dispatcher.dispatch({ now: new Date("2026-06-28T02:00:00.000Z") })).resolves.toMatchObject({
      status: "SKIPPED",
      reason: "NOT_DUE",
    });
    await expect(dispatcher.dispatch({ now: new Date("2026-06-28T02:00:00.000Z"), force: true })).resolves.toMatchObject({
      status: "SENT",
    });
  });
});
