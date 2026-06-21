const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const LINE_GROUP_ENDPOINT = "https://api.line.me/v2/bot/group";

type LineClientOptions = {
  accessToken: string;
  fetcher?: typeof fetch;
};

export function createLineClient({ accessToken, fetcher = fetch }: LineClientOptions) {
  return {
    async getGroupSummary(groupId: string) {
      if (!accessToken.trim()) throw new Error("LINE channel access token is not configured");
      if (!groupId.trim()) throw new Error("LINE group ID is required");

      const response = await fetcher(`${LINE_GROUP_ENDPOINT}/${encodeURIComponent(groupId.trim())}/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(1500),
      });

      if (!response.ok) throw new Error(`LINE group summary failed with status ${response.status}`);
      const payload: unknown = await response.json();
      if (!isLineGroupSummary(payload)) throw new Error("LINE group summary response is invalid");
      return { groupId: payload.groupId, groupName: payload.groupName };
    },

    async pushText(targetId: string, text: string) {
      if (!accessToken.trim()) throw new Error("LINE channel access token is not configured");
      if (!targetId.trim()) throw new Error("LINE target ID is required");
      if (!text.trim()) throw new Error("LINE message is required");

      const response = await fetcher(LINE_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: targetId,
          messages: [{ type: "text", text: text.slice(0, 5000) }],
        }),
      });

      if (!response.ok) throw new Error(`LINE push failed with status ${response.status}`);
    },
  };
}

function isLineGroupSummary(value: unknown): value is { groupId: string; groupName: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "groupId" in value &&
      typeof value.groupId === "string" &&
      "groupName" in value &&
      typeof value.groupName === "string",
  );
}

export function createServerLineClient(fetcher?: typeof fetch) {
  return createLineClient({
    accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
    fetcher,
  });
}
