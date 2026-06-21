import type { LineGroupEvent } from "./line-webhook";
import { extractLineGroupEvents, verifyLineWebhookSignature } from "./line-webhook";

export function createLineWebhookHandler({
  channelSecret,
  discoverGroups,
}: {
  channelSecret: string;
  discoverGroups(events: LineGroupEvent[]): Promise<unknown>;
}) {
  return async function handleLineWebhook(request: Request) {
    if (!channelSecret.trim()) return Response.json({ ok: false }, { status: 503 });

    const rawBody = await request.text();
    const signature = request.headers.get("X-Line-Signature");
    if (!verifyLineWebhookSignature(rawBody, signature, channelSecret)) {
      return Response.json({ ok: false }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return Response.json({ ok: false }, { status: 400 });
    }

    const groups = extractLineGroupEvents(payload);
    if (!groups.length) return Response.json({ ok: true });

    try {
      await discoverGroups(groups);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ ok: false }, { status: 500 });
    }
  };
}
