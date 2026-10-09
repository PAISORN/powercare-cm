import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  deleteStoredFile,
  readStoredFile,
  saveAnnouncementImageFile,
  saveAssetFile,
  saveOrganizationLogoFile,
  saveProfilePhotoFile,
  saveSignatureFile,
} from "./file-storage";

const originalEnv = { ...process.env };

function setSupabaseStorageEnv() {
  process.env.FILE_STORAGE_DRIVER = "supabase";
  process.env.SUPABASE_URL = "https://project-ref.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.SUPABASE_PROFILE_PHOTOS_BUCKET = "powercare-profile-photos";
  process.env.SUPABASE_SIGNATURES_BUCKET = "powercare-signatures";
  process.env.SUPABASE_ANNOUNCEMENTS_BUCKET = "powercare-announcements";
  process.env.SUPABASE_ORGANIZATION_LOGOS_BUCKET = "powercare-organization-logos";
}

describe("Supabase file storage", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    setSupabaseStorageEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  test("uploads profile photos to a versioned Supabase Storage path", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ Key: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["photo-bytes"], "avatar.jpg", { type: "image/jpeg" });

    const saved = await saveProfilePhotoFile("user-123", file);

    expect(saved.fileName).toBe("profile.jpg");
    expect(saved.mimeType).toBe("image/jpeg");
    expect(saved.fileSize).toBe(file.size);
    expect(saved.storagePath).toMatch(
      /^supabase:\/\/powercare-profile-photos\/users\/user-123\/profile\/[0-9a-f-]+$/,
    );
    expect(saved.checksum).toHaveLength(64);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/project-ref\.supabase\.co\/storage\/v1\/object\/powercare-profile-photos\/users\/user-123\/profile\/[0-9a-f-]+$/,
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "service-role-key",
          Authorization: "Bearer service-role-key",
          "Content-Type": "image/jpeg",
          "x-upsert": "true",
        }),
      }),
    );
  });

  test("uploads signatures to a versioned Supabase Storage path", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ Key: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["signature-bytes"], "signature.png", { type: "image/png" });

    const saved = await saveSignatureFile("user-123", file);

    expect(saved.fileName).toBe("signature.png");
    expect(saved.storagePath).toMatch(
      /^supabase:\/\/powercare-signatures\/users\/user-123\/signature\/[0-9a-f-]+$/,
    );
    expect(saved.uploadedAt).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/project-ref\.supabase\.co\/storage\/v1\/object\/powercare-signatures\/users\/user-123\/signature\/[0-9a-f-]+$/,
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "image/png",
          "x-upsert": "true",
        }),
      }),
    );
  });

  test("uploads announcement images to a stable path with upsert enabled", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ Key: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array([1, 2, 3])], "notice.webp", { type: "image/webp" });

    const saved = await saveAnnouncementImageFile("announcement-1", file);

    expect(saved.fileName).toBe("cover.webp");
    expect(saved.mimeType).toBe("image/webp");
    expect(saved.storagePath).toBe("supabase://powercare-announcements/announcements/announcement-1/cover");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project-ref.supabase.co/storage/v1/object/powercare-announcements/announcements/announcement-1/cover",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "image/webp", "x-upsert": "true" }),
      }),
    );
  });

  test("rejects announcement images larger than 2 MB", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(saveAnnouncementImageFile("announcement-1", file)).rejects.toThrow("2 MB or smaller");
  });

  test("uploads Asset images to the private Asset files bucket", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ Key: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array([1, 2, 3])], "machine.webp", { type: "image/webp" });

    const saved = await saveAssetFile("asset-123", file, "image");

    expect(saved.storagePath).toMatch(
      /^supabase:\/\/powercare-asset-files\/assets\/asset-123\/image\/[0-9a-f-]+\.webp$/,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/project-ref\.supabase\.co\/storage\/v1\/object\/powercare-asset-files\/assets\/asset-123\/image\/[0-9a-f-]+\.webp$/,
      ),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("rejects Asset images larger than 5 MB with an actionable message", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(saveAssetFile("asset-123", file, "image")).rejects.toThrow("5 MB or smaller");
  });

  test("uploads organization logos to a versioned storage path", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ Key: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array([1, 2, 3])], "company.webp", { type: "image/webp" });

    const saved = await saveOrganizationLogoFile("primary", file);

    expect(saved.fileName).toBe("company.webp");
    expect(saved.mimeType).toBe("image/webp");
    expect(saved.fileSize).toBe(file.size);
    expect(saved.storagePath).toContain("supabase://powercare-organization-logos/organizations/primary/");
  });

  test("rejects unsupported organization logo formats", async () => {
    const file = new File([new Uint8Array([1])], "company.gif", { type: "image/gif" });
    await expect(saveOrganizationLogoFile("primary", file)).rejects.toThrow(
      "Organization logo must be PNG, JPG, or WebP",
    );
  });

  test("rejects organization logos larger than 2 MB", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(saveOrganizationLogoFile("primary", file)).rejects.toThrow(
      "Organization logo must be 2 MB or smaller",
    );
  });

  test("downloads stored Supabase objects for authenticated app routes", async () => {
    const fetchMock = vi.fn(async () => new Response("stored-bytes", { status: 200, headers: { "Content-Type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);

    const stored = await readStoredFile("supabase://powercare-signatures/users/user-123/signature");

    expect(stored.bytes.toString("utf8")).toBe("stored-bytes");
    expect(stored.contentType).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://project-ref.supabase.co/storage/v1/object/powercare-signatures/users/user-123/signature",
      expect.objectContaining({ method: "GET" }),
    );
  });

  test("deletes Supabase objects by bucket and path", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteStoredFile("supabase://powercare-profile-photos/users/user-123/profile");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project-ref.supabase.co/storage/v1/object/powercare-profile-photos",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ prefixes: ["users/user-123/profile"] }),
      }),
    );
  });
});
