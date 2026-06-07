import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });

  const { userId } = await params;
  const signature = await db.signature.findUnique({ where: { userId } });
  if (!signature) return new NextResponse("Not found", { status: 404 });

  const bytes = await readFile(signature.storagePath);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": signature.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
