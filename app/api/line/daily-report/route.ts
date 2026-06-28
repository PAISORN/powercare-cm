import { NextResponse } from "next/server";
import { dispatchLineDailyReport } from "../../../../modules/line/line-daily-report-dispatcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const result = await dispatchLineDailyReport({ force });
  return NextResponse.json({ ok: true, ...result });
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
