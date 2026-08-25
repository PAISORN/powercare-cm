import { describe, expect, it, vi } from "vitest";
import { createLineDeliveryService, type LineDeliveryRecord, type LineDeliveryRepository } from "./line-delivery";

function repository(initial?: Partial<LineDeliveryRecord>) {
  const record: LineDeliveryRecord = {
    id: "delivery-1",
    eventId: "event-1",
    destinationId: "destination-1",
    eventType: "CLOSED",
    payloadJson: JSON.stringify({ text: "CM closed" }),
    status: "PENDING",
    attempts: 0,
    ...initial,
  };
  return {
    record,
    adapter: {
      createPending: vi.fn().mockResolvedValue(record),
      findById: vi.fn().mockResolvedValue(record),
      findByEvent: vi.fn().mockResolvedValue(record),
      claimFailed: vi.fn().mockResolvedValue(record),
      markSent: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    } satisfies LineDeliveryRepository,
  };
}

describe("LINE delivery lifecycle", () => {
  it("records SENT after a successful push", async () => {
    const repo = repository();
    const client = { pushText: vi.fn().mockResolvedValue(undefined) };
    const service = createLineDeliveryService({ repository: repo.adapter, client });

    await service.deliver({
      eventId: "event-1",
      eventType: "CLOSED",
      destinationId: "destination-1",
      targetId: "group-id",
      payload: { text: "CM closed" },
    });

    expect(client.pushText).toHaveBeenCalledWith("group-id", "CM closed");
    expect(repo.adapter.markSent).toHaveBeenCalledWith("delivery-1", 1, expect.any(Date));
  });

  it("records a sanitized FAILED result without rejecting the CM flow", async () => {
    const repo = repository();
    const client = { pushText: vi.fn().mockRejectedValue(new Error("secret-token network failure")) };
    const service = createLineDeliveryService({ repository: repo.adapter, client });

    await expect(
      service.deliver({
        eventId: "event-1",
        eventType: "CLOSED",
        destinationId: "destination-1",
        targetId: "group-id",
        payload: { text: "CM closed" },
      }),
    ).resolves.toBeUndefined();
    expect(repo.adapter.markFailed).toHaveBeenCalledWith("delivery-1", 1, "LINE delivery failed");
  });

  it("retries a persisted FAILED daily delivery and reports another failure", async () => {
    const repo = repository({ status: "FAILED", attempts: 1 });
    repo.adapter.createPending.mockResolvedValue(null);
    const client = { pushText: vi.fn().mockRejectedValue(new Error("network")) };
    const service = createLineDeliveryService({ repository: repo.adapter, client });
    await expect(service.deliver({ eventId: "event-1", eventType: "DAILY_REPORT", destinationId: "destination-1", targetId: "group-id", payload: { text: "Daily" }, retryFailed: true, throwOnFailure: true })).rejects.toThrow("network");
    expect(repo.adapter.findByEvent).toHaveBeenCalledWith("event-1", "destination-1");
    expect(repo.adapter.claimFailed).toHaveBeenCalledWith("delivery-1", 3);
    expect(repo.adapter.markFailed).toHaveBeenCalledWith("delivery-1", 2, "LINE delivery failed");
  });

  it("skips a duplicate PENDING delivery because only its creator may send", async () => {
    const repo = repository({ status: "PENDING" });
    repo.adapter.createPending.mockResolvedValue(null);
    const client = { pushText: vi.fn() };
    const service = createLineDeliveryService({ repository: repo.adapter, client });
    await service.deliver({ eventId: "event-1", eventType: "DAILY_REPORT", destinationId: "destination-1", targetId: "group-id", payload: { text: "Daily" }, retryFailed: true, throwOnFailure: true });
    expect(repo.adapter.claimFailed).not.toHaveBeenCalled();
    expect(client.pushText).not.toHaveBeenCalled();
  });

  it("allows only one overlapping FAILED retry claimant to push", async () => {
    const repo = repository({ status: "FAILED", attempts: 1 });
    repo.adapter.createPending.mockResolvedValue(null);
    repo.adapter.claimFailed.mockResolvedValueOnce(repo.record).mockResolvedValueOnce(null);
    const client = { pushText: vi.fn().mockResolvedValue(undefined) };
    const service = createLineDeliveryService({ repository: repo.adapter, client });
    const input = { eventId: "event-1", eventType: "DAILY_REPORT", destinationId: "destination-1", targetId: "group-id", payload: { text: "Daily" }, retryFailed: true, throwOnFailure: true } as const;
    await Promise.all([service.deliver(input), service.deliver(input)]);
    expect(repo.adapter.claimFailed).toHaveBeenCalledTimes(2);
    expect(client.pushText).toHaveBeenCalledOnce();
    expect(repo.adapter.markSent).toHaveBeenCalledWith("delivery-1", 2, expect.any(Date));
  });

  it("does not send a duplicate event and destination", async () => {
    const repo = repository();
    repo.adapter.createPending.mockResolvedValue(null);
    const client = { pushText: vi.fn() };
    const service = createLineDeliveryService({ repository: repo.adapter, client });

    await service.deliver({
      eventId: "event-1",
      eventType: "CLOSED",
      destinationId: "destination-1",
      targetId: "group-id",
      payload: { text: "CM closed" },
    });

    expect(client.pushText).not.toHaveBeenCalled();
  });

  it("caps manual retries at three attempts", async () => {
    const repo = repository({ status: "FAILED", attempts: 3 });
    const client = { pushText: vi.fn() };
    const service = createLineDeliveryService({ repository: repo.adapter, client });

    await expect(service.retry("delivery-1", "group-id")).rejects.toThrow("LINE delivery retry limit reached");
    expect(client.pushText).not.toHaveBeenCalled();
  });
});
