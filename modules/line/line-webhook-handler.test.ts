import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createLineWebhookHandler } from "./line-webhook-handler";

const secret = "channel-secret";

function signedRequest(body: string, signatureSecret = secret) {
  const signature = createHmac("sha256", signatureSecret).update(body).digest("base64");
  return new Request("https://example.com/api/line/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Line-Signature": signature },
    body,
  });
}

describe("LINE webhook HTTP handler", () => {
  it("returns 503 when the channel secret is not configured", async () => {
    const handler = createLineWebhookHandler({ channelSecret: "", discoverGroups: vi.fn() });
    expect((await handler(signedRequest('{"events":[]}'))).status).toBe(503);
  });

  it("returns 401 for a missing or invalid signature", async () => {
    const handler = createLineWebhookHandler({ channelSecret: secret, discoverGroups: vi.fn() });
    const missing = new Request("https://example.com/api/line/webhook", { method: "POST", body: '{"events":[]}' });

    expect((await handler(missing)).status).toBe(401);
    expect((await handler(signedRequest('{"events":[]}', "wrong-secret"))).status).toBe(401);
  });

  it("returns 400 for signed invalid JSON", async () => {
    const handler = createLineWebhookHandler({ channelSecret: secret, discoverGroups: vi.fn() });
    expect((await handler(signedRequest("not-json"))).status).toBe(400);
  });

  it("acknowledges an empty event list", async () => {
    const discoverGroups = vi.fn();
    const handler = createLineWebhookHandler({ channelSecret: secret, discoverGroups });

    expect((await handler(signedRequest('{"events":[]}'))).status).toBe(200);
    expect(discoverGroups).not.toHaveBeenCalled();
  });

  it("passes signed group events to discovery", async () => {
    const discoverGroups = vi.fn();
    const handler = createLineWebhookHandler({ channelSecret: secret, discoverGroups });
    const body = JSON.stringify({ events: [{ type: "join", source: { type: "group", groupId: "C1" } }] });

    expect((await handler(signedRequest(body))).status).toBe(200);
    expect(discoverGroups).toHaveBeenCalledWith([{ groupId: "C1", eventType: "join" }]);
  });

  it("returns 500 when persistence fails so LINE can retry", async () => {
    const discoverGroups = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const handler = createLineWebhookHandler({ channelSecret: secret, discoverGroups });
    const body = JSON.stringify({ events: [{ type: "join", source: { type: "group", groupId: "C1" } }] });

    const response = await handler(signedRequest(body));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ ok: false });
  });
});
