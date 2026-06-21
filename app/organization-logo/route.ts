import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { readStoredFile } from "../../lib/file-storage";
import { getCurrentUser } from "../../lib/session";
import { ORGANIZATION_PROFILE_ID } from "../../modules/organization/organization-profile";

export const preferredRegion = "home";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });

  const organization = await db.organizationProfile.findUnique({
    where: { id: ORGANIZATION_PROFILE_ID },
  });
  if (!organization?.logoStoragePath) return new NextResponse("Not found", { status: 404 });

  const stored = await readStoredFile(organization.logoStoragePath);
  return new NextResponse(new Uint8Array(stored.bytes), {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Type": organization.logoMimeType || stored.contentType || "application/octet-stream",
    },
  });
}
