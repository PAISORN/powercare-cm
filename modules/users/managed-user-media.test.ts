import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteStoredFile: vi.fn(),
  saveProfilePhotoFile: vi.fn(),
  saveSignatureFile: vi.fn(),
}));

vi.mock("../../lib/file-storage", () => mocks);

import { stageManagedUserMedia } from "./managed-user-media";

const signatureFile = new File(["sig"], "signature.png", {
  type: "image/png",
});
const profilePhotoFile = new File(["photo"], "profile.webp", {
  type: "image/webp",
});

describe("managed user media lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveSignatureFile.mockResolvedValue({
      storagePath: "signatures/new",
    });
    mocks.saveProfilePhotoFile.mockResolvedValue({
      storagePath: "profiles/new",
    });
  });

  it("removes an earlier staged file when a later upload fails", async () => {
    mocks.saveProfilePhotoFile.mockRejectedValue(new Error("upload failed"));

    await expect(
      stageManagedUserMedia({
        userId: "user-1",
        signatureFile,
        profilePhotoFile,
      }),
    ).rejects.toThrow("upload failed");

    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("signatures/new");
  });

  it("discards both staged files when persistence fails", async () => {
    const staged = await stageManagedUserMedia({
      userId: "user-1",
      signatureFile,
      profilePhotoFile,
    });

    await staged.discard();

    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("signatures/new");
    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("profiles/new");
  });

  it("removes replaced files only after persistence succeeds", async () => {
    const staged = await stageManagedUserMedia({
      userId: "user-1",
      signatureFile,
      profilePhotoFile,
    });

    await staged.finalize({
      signatureStoragePath: "signatures/old",
      profilePhotoStoragePath: "profiles/old",
    });

    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("signatures/old");
    expect(mocks.deleteStoredFile).toHaveBeenCalledWith("profiles/old");
    expect(mocks.deleteStoredFile).not.toHaveBeenCalledWith("signatures/new");
    expect(mocks.deleteStoredFile).not.toHaveBeenCalledWith("profiles/new");
  });
});
