import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { readStoredFile } from "../../../lib/file-storage";
import { getCurrentUser } from "../../../lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });

  const { userId } = await params;
  const signature = await db.signature.findUnique({ where: { userId } });
  if (!signature) return new NextResponse("Not found", { status: 404 });

  const { bytes, contentType } = await readStoredFile(signature.storagePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType || signature.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
