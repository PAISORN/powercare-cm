import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedMimeTypes = ["image/png", "image/jpeg"];
const maxBytes = 2 * 1024 * 1024;

export async function saveSignatureFile(userId: string, file: File) {
  if (!allowedMimeTypes.includes(file.type)) throw new Error("Signature must be PNG or JPG");
  if (file.size > maxBytes) throw new Error("Signature must be 2 MB or smaller");

  const extension = file.type === "image/png" ? "png" : "jpg";
  const storageDir = path.join(process.cwd(), "storage", "signatures");
  await mkdir(storageDir, { recursive: true });

  const fileName = `${userId}.${extension}`;
  const storagePath = path.join(storageDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, bytes);

  return {
    fileName,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
  };
}
