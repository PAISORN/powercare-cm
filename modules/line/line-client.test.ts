import { describe, expect, it, vi } from "vitest";
import { createLineClient } from "./line-client";

describe("LINE Messaging API client", () => {
  it("retrieves a group summary with the configured access token", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ groupId: "C1", groupName: "CM Test" }));
    const client = createLineClient({ accessToken: "token", fetcher });

    await expect(client.getGroupSummary("C1")).resolves.toEqual({ groupId: "C1", groupName: "CM Test" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/group/C1/summary",
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects an empty group ID without calling LINE", async () => {
    const fetcher = vi.fn();
    const client = createLineClient({ accessToken: "token", fetcher });

    await expect(client.getGroupSummary(" ")).rejects.toThrow("LINE group ID is required");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports only the HTTP status when group summary lookup fails", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("secret response", { status: 403 }));
    const client = createLineClient({ accessToken: "secret-token", fetcher });

    await expect(client.getGroupSummary("C1")).rejects.toThrow("LINE group summary failed with status 403");
    await expect(client.getGroupSummary("C1")).rejects.not.toThrow("secret-token");
    await expect(client.getGroupSummary("C1")).rejects.not.toThrow("secret response");
  });

  it("pushes a text message to the configured target", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const client = createLineClient({ accessToken: "token", fetcher });

    await client.pushText("group-id", "CM-2026-06-0001: New request");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/message/push",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
    const request = fetcher.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      to: "group-id",
      messages: [{ type: "text", text: "CM-2026-06-0001: New request" }],
    });
  });

  it("throws a sanitized error without the access token", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const client = createLineClient({ accessToken: "secret-token", fetcher });

    await expect(client.pushText("group-id", "message")).rejects.toThrow("LINE push failed with status 401");
    await expect(client.pushText("group-id", "message")).rejects.not.toThrow("secret-token");
  });

  it("rejects missing server credentials before making a request", async () => {
    const fetcher = vi.fn();
    const client = createLineClient({ accessToken: "", fetcher });

    await expect(client.pushText("group-id", "message")).rejects.toThrow("LINE channel access token is not configured");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
