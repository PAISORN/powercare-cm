import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  cmWork: { findMany: vi.fn() },
  pmWork: { findMany: vi.fn() },
  userNotification: { groupBy: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
};
vi.mock("../../lib/db", () => ({ db }));

describe("PM notification reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.cmWork.findMany.mockResolvedValue([{ id: "cm-in-scope" }]);
    db.pmWork.findMany.mockResolvedValue([{ id: "pm-in-scope" }]);
    db.userNotification.updateMany.mockResolvedValue({ count: 1 });
    db.userNotification.groupBy.mockResolvedValue([{ targetStatus: "PLANNED", _count: { _all: 2 } }]);
  });

  it("marks one PM work only when it is in the operational scope", async () => {
    const { markEntityRead } = await import("./notification-service");
    await markEntityRead("user", "PmWork", "pm-in-scope", { plantId: "site" });
    expect(db.userNotification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ recipientId: "user", entityType: "PmWork", entityId: { in: ["pm-in-scope"] } }) }));
    await expect(markEntityRead("user", "PmWork", "pm-outside", { plantId: "site" })).resolves.toEqual({ count: 0 });
  });

  it("marks a PM status group and all scoped notifications", async () => {
    const { markAllNotificationsRead, markPmStatusGroupRead } = await import("./notification-service");
    await markPmStatusGroupRead("user", "PLANNED", { plantId: "site" });
    expect(db.userNotification.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ entityType: "PmWork", targetStatus: "PLANNED" }) }));
    await markAllNotificationsRead("user", { plantId: "site" });
    expect(db.userNotification.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ recipientId: "user", OR: expect.any(Array) }) }));
  });

  it("returns a PM-only unread summary without changing the CM summary contract", async () => {
    const { getPmUnreadSummary } = await import("./notification-service");
    await expect(getPmUnreadSummary("user", { plantId: "site" })).resolves.toMatchObject({ total: 2, byStatus: { PLANNED: 2 } });
    expect(db.userNotification.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ entityType: "PmWork" }) }));
  });
});
