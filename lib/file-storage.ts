import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedMimeTypes = ["image/png", "image/jpeg"];
const maxBytes = 500 * 1024;
const allowedProfilePhotoMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const maxProfilePhotoBytes = 1 * 1024 * 1024;
const defaultProfilePhotosBucket = "powercare-profile-photos";
const defaultSignaturesBucket = "powercare-signatures";
const allowedAnnouncementMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const maxAnnouncementBytes = 2 * 1024 * 1024;
const defaultAnnouncementsBucket = "powercare-announcements";
const allowedOrganizationLogoMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const maxOrganizationLogoBytes = 2 * 1024 * 1024;
const defaultOrganizationLogosBucket = "powercare-organization-logos";

type StorageTarget = {
  bucket: string;
  objectPath: string;
};

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function isSupabaseStorageEnabled() {
  return process.env.FILE_STORAGE_DRIVER === "supabase";
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_STORAGE_KEY;
  if (!url || !key) {
    throw new Error("Supabase Storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  return { url, key };
}

function toSupabasePath(target: StorageTarget) {
  return `supabase://${target.bucket}/${target.objectPath}`;
}

function parseSupabasePath(storagePath: string): StorageTarget | null {
  if (!storagePath.startsWith("supabase://")) return null;
  const withoutProtocol = storagePath.slice("supabase://".length);
  const slashIndex = withoutProtocol.indexOf("/");
  if (slashIndex <= 0) return null;
  return {
    bucket: withoutProtocol.slice(0, slashIndex),
    objectPath: withoutProtocol.slice(slashIndex + 1),
  };
}

function storageUrl(bucket: string, objectPath = "") {
  const { url } = supabaseConfig();
  const encodedPath = objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${url}/storage/v1/object/${bucket}${encodedPath ? `/${encodedPath}` : ""}`;
}

function storageHeaders(contentType?: string) {
  const { key } = supabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function uploadSupabaseObject(target: StorageTarget, bytes: Buffer, mimeType: string) {
  const response = await fetch(storageUrl(target.bucket, target.objectPath), {
    method: "POST",
    headers: {
      ...storageHeaders(mimeType),
      "Cache-Control": "max-age=60",
      "x-upsert": "true",
    },
    body: new Blob([new Uint8Array(bytes)], { type: mimeType }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${response.status}) ${detail}`);
  }
}

export async function saveSignatureFile(userId: string, file: File) {
  if (!allowedMimeTypes.includes(file.type)) throw new Error("Signature must be PNG or JPG");
  if (file.size > maxBytes) throw new Error("Signature must be 500 KB or smaller");

  const extension = extensionForMimeType(file.type);
  const bytes = Buffer.from(await file.arrayBuffer());
  const supabaseFileName = `signature.${extension}`;
  const uploadedAt = new Date();

  if (isSupabaseStorageEnabled()) {
    const target = {
      bucket: process.env.SUPABASE_SIGNATURES_BUCKET || defaultSignaturesBucket,
      objectPath: `users/${userId}/signature`,
    };
    await uploadSupabaseObject(target, bytes, file.type);
    return {
      fileName: supabaseFileName,
      mimeType: file.type,
      fileSize: file.size,
      storagePath: toSupabasePath(target),
      uploadedAt,
    };
  }

  const storageDir = path.join(process.cwd(), "storage", "signatures");
  await mkdir(storageDir, { recursive: true });

  const fileName = `${userId}.${extension}`;
  const storagePath = path.join(storageDir, fileName);
  await writeFile(storagePath, bytes);

  return {
    fileName,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
    uploadedAt,
  };
}

export async function saveProfilePhotoFile(userId: string, file: File) {
  if (!allowedProfilePhotoMimeTypes.includes(file.type)) throw new Error("Profile photo must be PNG, JPG, or WebP");
  if (file.size > maxProfilePhotoBytes) throw new Error("Profile photo must be 1 MB or smaller");

  const extension = extensionForMimeType(file.type);
  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const supabaseFileName = `profile.${extension}`;

  if (isSupabaseStorageEnabled()) {
    const target = {
      bucket: process.env.SUPABASE_PROFILE_PHOTOS_BUCKET || defaultProfilePhotosBucket,
      objectPath: `users/${userId}/profile`,
    };
    await uploadSupabaseObject(target, bytes, file.type);
    return {
      fileName: supabaseFileName,
      mimeType: file.type,
      fileSize: file.size,
      storagePath: toSupabasePath(target),
      checksum,
    };
  }

  const storageDir = path.join(process.cwd(), "storage", "profile-photos");
  await mkdir(storageDir, { recursive: true });

  const fileName = `${userId}.${extension}`;
  const storagePath = path.join(storageDir, fileName);
  await writeFile(storagePath, bytes);

  return {
    fileName,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
    checksum,
  };
}

export async function saveAnnouncementImageFile(announcementId: string, file: File) {
  if (!allowedAnnouncementMimeTypes.includes(file.type)) {
    throw new Error("Announcement image must be PNG, JPG, or WebP");
  }
  if (file.size > maxAnnouncementBytes) {
    throw new Error("Announcement image must be 2 MB or smaller");
  }

  const extension = extensionForMimeType(file.type);
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = `cover.${extension}`;

  if (isSupabaseStorageEnabled()) {
    const target = {
      bucket: process.env.SUPABASE_ANNOUNCEMENTS_BUCKET || defaultAnnouncementsBucket,
      objectPath: `announcements/${announcementId}/cover`,
    };
    await uploadSupabaseObject(target, bytes, file.type);
    return {
      fileName,
      mimeType: file.type,
      fileSize: file.size,
      storagePath: toSupabasePath(target),
    };
  }

  const storageDir = path.join(process.cwd(), "storage", "announcements", announcementId);
  await mkdir(storageDir, { recursive: true });
  const storagePath = path.join(storageDir, "cover");
  await writeFile(storagePath, bytes);
  return {
    fileName,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
  };
}

export async function saveOrganizationLogoFile(organizationId: string, file: File) {
  if (!allowedOrganizationLogoMimeTypes.includes(file.type)) {
    throw new Error("Organization logo must be PNG, JPG, or WebP");
  }
  if (file.size > maxOrganizationLogoBytes) {
    throw new Error("Organization logo must be 2 MB or smaller");
  }

  const extension = extensionForMimeType(file.type);
  const bytes = Buffer.from(await file.arrayBuffer());
  const version = randomUUID();
  const fileName = `company.${extension}`;

  if (isSupabaseStorageEnabled()) {
    const target = {
      bucket: process.env.SUPABASE_ORGANIZATION_LOGOS_BUCKET || defaultOrganizationLogosBucket,
      objectPath: `organizations/${organizationId}/${version}`,
    };
    await uploadSupabaseObject(target, bytes, file.type);
    return {
      fileName,
      mimeType: file.type,
      fileSize: file.size,
      storagePath: toSupabasePath(target),
    };
  }

  const storageDir = path.join(process.cwd(), "storage", "organization-logos", organizationId);
  await mkdir(storageDir, { recursive: true });
  const storagePath = path.join(storageDir, `${version}.${extension}`);
  await writeFile(storagePath, bytes);
  return {
    fileName,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
  };
}

export async function readStoredFile(storagePath: string) {
  const target = parseSupabasePath(storagePath);
  if (!target) {
    return {
      bytes: await readFile(storagePath),
      contentType: undefined,
    };
  }

  const response = await fetch(storageUrl(target.bucket, target.objectPath), {
    method: "GET",
    headers: storageHeaders(),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase Storage download failed (${response.status}) ${detail}`);
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("Content-Type") || undefined,
  };
}

export async function deleteStoredFile(storagePath?: string | null) {
  if (!storagePath) return;
  const target = parseSupabasePath(storagePath);
  if (target) {
    try {
      await fetch(storageUrl(target.bucket), {
        method: "DELETE",
        headers: {
          ...storageHeaders("application/json"),
        },
        body: JSON.stringify({ prefixes: [target.objectPath] }),
      });
    } catch {
      // The database row is the source of truth; missing files should not block user actions.
    }
    return;
  }

  try {
    await unlink(storagePath);
  } catch {
    // The database row is the source of truth; missing files should not block user actions.
  }
}
