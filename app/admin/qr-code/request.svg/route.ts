import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/session";
import { RoleName } from "../../../../modules/cm-work/cm-work-types";
import { getGeneralRequestUrl } from "../../../../lib/public-url";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== RoleName.ADMIN) return new NextResponse("Forbidden", { status: 403 });

  const requestUrl = getGeneralRequestUrl({
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    origin: request.nextUrl.origin,
    vercelUrl: process.env.VERCEL_URL,
  });

  const svg = await QRCode.toString(requestUrl, {
    type: "svg",
    margin: 2,
    width: 720,
    color: {
      dark: "#0f5132",
      light: "#ffffff",
    },
  });

  return new NextResponse(svg, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'inline; filename="powercare-general-request-qr.svg"',
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
