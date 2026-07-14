import { describe, expect, it } from "vitest";
import { groupUnreadByStatus, groupToStatuses } from "./notification-service";

describe("notification unread groups", () => {
  it("groups exact statuses into dashboard aggregates", () => {
    const result = groupUnreadByStatus([
      { targetStatus: "NEW", count: 2 },
      { targetStatus: "CLAIMED", count: 3 },
      { targetStatus: "WAITING_TO_CLOSE", count: 1 },
      { targetStatus: "CLOSED", count: 4 },
    ]);
    expect(result).toMatchObject({ total: 10, newRequest: 2, inProcess: 4, closed: 4, canceled: 0 });
    expect(result.byStatus.CLAIMED).toBe(3);
  });

  it("maps read groups to the intended statuses", () => {
    expect(groupToStatuses("IN_PROCESS")).toEqual(["WAITING_TO_CLAIM", "CLAIMED", "IN_PROGRESS", "BACKLOG_SHUTDOWN", "WAITING_TO_CLOSE", "RETURNED_FOR_CORRECTION"]);
    expect(groupToStatuses("NEW")).toEqual(["NEW"]);
    expect(groupToStatuses("ALL_CM")).toBeNull();
  });
});
