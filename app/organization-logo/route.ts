import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { readStoredFile } from "../../lib/file-storage";
import { getCurrentUser } from "../../lib/session";
import { DEFAULT_ORGANIZATION_ID } from "../../modules/organization/organization-foundation";

export const preferredRegion = "home";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId")?.trim();
  const requestedPlantId = new URL(request.url).searchParams.get("plantId")?.trim();
  if (!currentUser && !requestedOrganizationId && !requestedPlantId) return new NextResponse("Unauthorized", { status: 401 });

  if (requestedPlantId) {
    const plantProfile = await db.plantProfile.findUnique({ where: { plantId: requestedPlantId } });
    if (!plantProfile?.logoStoragePath) return new NextResponse("Not found", { status: 404 });
    const stored = await readStoredFile(plantProfile.logoStoragePath);
    return new NextResponse(new Uint8Array(stored.bytes), {
      headers: {
        "Cache-Control": "public, max-age=60",
        "Content-Type": stored.contentType ?? plantProfile.logoMimeType ?? "application/octet-stream",
      },
    });
  }

  const organizationId = requestedOrganizationId || currentUser?.organizationId || DEFAULT_ORGANIZATION_ID;

  const organization = await db.organizationProfile.findUnique({ where: { organizationId } });
  if (!organization?.logoStoragePath) return new NextResponse("Not found", { status: 404 });

  const stored = await readStoredFile(organization.logoStoragePath);
  return new NextResponse(new Uint8Array(stored.bytes), {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Type": organization.logoMimeType || stored.contentType || "application/octet-stream",
    },
  });
}
