import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractLineGroupEvents, verifyLineWebhookSignature } from "./line-webhook";

describe("LINE webhook security", () => {
  it("accepts only the signature for the exact raw body", () => {
    const body = JSON.stringify({ events: [] });
    const secret = "channel-secret";
    const signature = createHmac("sha256", secret).update(body).digest("base64");

    expect(verifyLineWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyLineWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(verifyLineWebhookSignature(body, "not-base64", secret)).toBe(false);
    expect(verifyLineWebhookSignature(body, signature, "")).toBe(false);
  });

  it("returns one latest discovery per valid group and ignores user sources", () => {
    expect(
      extractLineGroupEvents({
        events: [
          { type: "join", timestamp: 1, source: { type: "group", groupId: "C-group-1" } },
          { type: "message", timestamp: 2, source: { type: "group", groupId: "C-group-1" } },
          { type: "message", timestamp: 3, source: { type: "user", userId: "U-user" } },
        ],
      }),
    ).toEqual([{ groupId: "C-group-1", eventType: "message" }]);
  });

  it("ignores malformed events and payloads", () => {
    expect(extractLineGroupEvents(null)).toEqual([]);
    expect(extractLineGroupEvents({ events: "invalid" })).toEqual([]);
    expect(extractLineGroupEvents({ events: [{ type: "message", source: { type: "group" } }] })).toEqual([]);
  });
});
