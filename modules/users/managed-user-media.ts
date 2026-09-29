import {
  deleteStoredFile,
  saveProfilePhotoFile,
  saveSignatureFile,
} from "../../lib/file-storage";

type SavedSignature = Awaited<ReturnType<typeof saveSignatureFile>>;
type SavedProfilePhoto = Awaited<ReturnType<typeof saveProfilePhotoFile>>;

export async function stageManagedUserMedia(input: {
  userId: string;
  signatureFile: File | null;
  profilePhotoFile: File | null;
}) {
  let signature: SavedSignature | null = null;
  let profilePhoto: SavedProfilePhoto | null = null;

  try {
    signature = input.signatureFile
      ? await saveSignatureFile(input.userId, input.signatureFile)
      : null;
    profilePhoto = input.profilePhotoFile
      ? await saveProfilePhotoFile(input.userId, input.profilePhotoFile)
      : null;
  } catch (error) {
    await removeFiles(signature?.storagePath, profilePhoto?.storagePath);
    throw error;
  }

  return {
    signature,
    profilePhoto,
    discard: () =>
      removeFiles(signature?.storagePath, profilePhoto?.storagePath),
    finalize: (previous: {
      signatureStoragePath?: string | null;
      profilePhotoStoragePath?: string | null;
    }) =>
      removeFiles(
        replacedPath(previous.signatureStoragePath, signature?.storagePath),
        replacedPath(
          previous.profilePhotoStoragePath,
          profilePhoto?.storagePath,
        ),
      ),
  };
}

function replacedPath(
  previousPath: string | null | undefined,
  nextPath: string | null | undefined,
) {
  return nextPath && previousPath && previousPath !== nextPath
    ? previousPath
    : null;
}

async function removeFiles(...paths: (string | null | undefined)[]) {
  await Promise.all(paths.map((storagePath) => deleteStoredFile(storagePath)));
}
