import { describe, expect, it, vi } from "vitest";
import { createLineGroupDiscoveryService } from "./line-group-discovery-service";

describe("LINE group discovery service", () => {
  it("stores the group name returned by LINE", async () => {
    const repository = { upsert: vi.fn() };
    const summaryClient = { getGroupSummary: vi.fn().mockResolvedValue({ groupId: "C1", groupName: "CM Test" }) };
    const now = new Date("2026-06-21T04:00:00.000Z");
    const service = createLineGroupDiscoveryService({ repository, summaryClient, now: () => now });

    await service.discover([{ groupId: "C1", eventType: "join" }]);

    expect(repository.upsert).toHaveBeenCalledWith({
      groupId: "C1",
      eventType: "join",
      displayName: "CM Test",
      seenAt: now,
    });
  });

  it("stores the Group ID when the summary request fails", async () => {
    const repository = { upsert: vi.fn() };
    const summaryClient = { getGroupSummary: vi.fn().mockRejectedValue(new Error("network")) };
    const service = createLineGroupDiscoveryService({ repository, summaryClient });

    await expect(service.discover([{ groupId: "C1", eventType: "message" }])).resolves.toBeUndefined();
    expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
      groupId: "C1",
      eventType: "message",
      displayName: null,
    }));
  });

  it("deduplicates a group and keeps its latest event type", async () => {
    const repository = { upsert: vi.fn() };
    const summaryClient = { getGroupSummary: vi.fn().mockResolvedValue({ groupId: "C1", groupName: "CM Test" }) };
    const service = createLineGroupDiscoveryService({ repository, summaryClient });

    await service.discover([
      { groupId: "C1", eventType: "join" },
      { groupId: "C1", eventType: "message" },
    ]);

    expect(repository.upsert).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({ eventType: "message" }));
  });
});
