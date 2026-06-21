import { describe, expect, it } from "vitest";
import { formatLineWorkMessage, mapCmNotificationToLineEvent } from "./line-work-event";

describe("LINE CM work events", () => {
  it("maps existing CM notification events to Admin-configurable LINE events", () => {
    expect(mapCmNotificationToLineEvent("NEW_REQUEST")).toBe("NEW_REQUEST");
    expect(mapCmNotificationToLineEvent("ASSIGNED")).toBe("REASSIGNED");
    expect(mapCmNotificationToLineEvent("IN_PROGRESS")).toBe("STATUS_CHANGED");
    expect(mapCmNotificationToLineEvent("RELEASED")).toBe("STATUS_CHANGED");
    expect(mapCmNotificationToLineEvent("ANNOUNCEMENT_PUBLISHED")).toBeNull();
  });

  it("formats a concise Thai work message", () => {
    const message = formatLineWorkMessage({
      eventId: "history-1",
      eventType: "CLOSED",
      categoryId: "electrical",
      workId: "work-1",
      workNumber: "CM-2026-06-0001",
      machineName: "Boiler Feed Pump",
      statusLabel: "ปิดงานแล้ว",
      actorName: "Electrical Engineer",
    });

    expect(message).toContain("PowerCare.CM");
    expect(message).toContain("CM-2026-06-0001");
    expect(message).toContain("Boiler Feed Pump");
    expect(message).toContain("ปิดงานแล้ว");
    expect(message).toContain("Electrical Engineer");
  });

  it("shows the Thai work category before the machine name", () => {
    const baseEvent = {
      eventId: "history-2",
      eventType: "NEW_REQUEST" as const,
      workId: "work-2",
      workNumber: "CM-2026-06-0002",
      machineName: "Cooling Pump",
      statusLabel: "แจ้งใหม่",
    };

    const electricalMessage = formatLineWorkMessage({
      ...baseEvent,
      categoryId: "cmq40qtl3000010kizqfayx9p",
      categoryName: "งานไฟฟ้า",
    });
    const mechanicalMessage = formatLineWorkMessage({
      ...baseEvent,
      categoryId: "cmq40qtnv000110kivkum24k8",
      categoryName: "งานเครื่องกล",
    });
    const uncategorizedMessage = formatLineWorkMessage({ ...baseEvent, categoryId: null, categoryName: null });

    expect(electricalMessage).toContain("ประเภทงาน: งานไฟฟ้า");
    expect(mechanicalMessage).toContain("ประเภทงาน: งานเครื่องกล");
    expect(uncategorizedMessage).toContain("ประเภทงาน: ไม่ระบุ");
    expect(electricalMessage.indexOf("ประเภทงาน:")).toBeLessThan(electricalMessage.indexOf("เครื่องจักร:"));
  });
});
