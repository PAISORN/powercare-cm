import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { getCurrentUser } from "../../../../lib/session";
import { canManageQrCode } from "../../../../modules/auth/permission";
import { getPlantRequestUrl, getPlantStoreIssueUrl } from "../../../../lib/public-url";
import { readOrganizationScope } from "../../../../modules/organization/organization-scope-service";
import { RoleName } from "../../../../modules/cm-work/cm-work-types";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !canManageQrCode(user)) return new NextResponse("Forbidden", { status: 403 });
  const scope = await readOrganizationScope();
  const requestedOrganizationId = request.nextUrl.searchParams.get("organizationId") || scope.organization.id;
  const organizationId = user.role === RoleName.ADMIN ? requestedOrganizationId : scope.organization.id;
  const selectedPlantId = request.nextUrl.searchParams.get("plantId") || user.plantId || scope.plant.id;
  const selectedPlant = await db.plant.findFirst({
    where: { id: selectedPlantId, organizationId },
    select: { id: true, code: true, inventoryCode: true, name: true, publicStoreIssueEnabled: true },
  });
  if (!selectedPlant) return new NextResponse("Site not found", { status: 404 });
  if (user.plantId && selectedPlant.id !== user.plantId) return new NextResponse("Forbidden", { status: 403 });
  const qrType = request.nextUrl.searchParams.get("type");
  if (qrType === "store" && (!selectedPlant.inventoryCode || !selectedPlant.publicStoreIssueEnabled)) {
    return new NextResponse("Public Store Issue is not enabled", { status: 404 });
  }

  const publicUrlInput = {
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
    origin: request.nextUrl.origin,
    vercelUrl: process.env.VERCEL_URL,
  };
  const requestUrl = qrType === "store"
    ? getPlantStoreIssueUrl(publicUrlInput, selectedPlant.inventoryCode as string)
    : getPlantRequestUrl(publicUrlInput, selectedPlant.code);

  const svg = await QRCode.toString(requestUrl, {
    type: "svg",
    margin: 2,
    width: 720,
    color: {
      dark: "#0f5132",
      light: "#ffffff",
    },
  });
  const fileSafeCode = selectedPlant.code.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const filePrefix = qrType === "store" ? "powercare-store-issue-qr" : "powercare-site-request-qr";

  return new NextResponse(svg, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${filePrefix}-${fileSafeCode}.svg"`,
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
