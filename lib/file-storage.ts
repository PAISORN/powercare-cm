import { createHash } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedMimeTypes = ["image/png", "image/jpeg"];
const maxBytes = 2 * 1024 * 1024;
const allowedProfilePhotoMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const maxProfilePhotoBytes = 5 * 1024 * 1024;

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

export async function saveProfilePhotoFile(userId: string, file: File) {
  if (!allowedProfilePhotoMimeTypes.includes(file.type)) throw new Error("Profile photo must be PNG, JPG, or WebP");
  if (file.size > maxProfilePhotoBytes) throw new Error("Profile photo must be 5 MB or smaller");

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storageDir = path.join(process.cwd(), "storage", "profile-photos");
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
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function deleteStoredFile(storagePath?: string | null) {
  if (!storagePath) return;
  try {
    await unlink(storagePath);
  } catch {
    // The database row is the source of truth; missing files should not block user actions.
  }
}
