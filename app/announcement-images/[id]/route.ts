import { NextResponse } from "next/server";
import { readStoredFile } from "../../../lib/file-storage";
import { db } from "../../../lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = new Date();
  const announcement = await db.announcement.findFirst({
    where: {
      id,
      organizationId: null,
      active: true,
      publishStart: { lte: now },
      publishEnd: { gte: now },
      imageStoragePath: { not: null },
    },
  });
  if (!announcement?.imageStoragePath) return new NextResponse("Not found", { status: 404 });

  const stored = await readStoredFile(announcement.imageStoragePath);
  return new NextResponse(new Uint8Array(stored.bytes), {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Content-Type": announcement.imageMimeType || stored.contentType || "application/octet-stream",
    },
  });
}
