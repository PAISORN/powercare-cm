import { discoverLineGroups } from "../../../../modules/line/line-group-discovery-service";
import { createLineWebhookHandler } from "../../../../modules/line/line-webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return createLineWebhookHandler({
    channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
    discoverGroups: discoverLineGroups,
  })(request);
}
