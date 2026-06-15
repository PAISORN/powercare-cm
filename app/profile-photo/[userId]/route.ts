import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });

  const { userId } = await params;
  const photo = await db.profilePhoto.findUnique({ where: { userId } });
  if (!photo) return new NextResponse("Not found", { status: 404 });

  const bytes = await readFile(photo.storagePath);
  const body = new Blob([new Uint8Array(bytes)], { type: photo.mimeType });
  return new NextResponse(body, {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
