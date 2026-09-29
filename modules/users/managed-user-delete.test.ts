import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  auditUpdateMany: vi.fn(),
  cmWorkUpdateMany: vi.fn(),
  deleteStoredFile: vi.fn(),
  profilePhotoDeleteMany: vi.fn(),
  signatureDeleteMany: vi.fn(),
  statusHistoryUpdateMany: vi.fn(),
  transaction: vi.fn(),
  userDelete: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    auditEvent: {
      create: mocks.auditCreate,
      updateMany: mocks.auditUpdateMany,
    },
    cmWork: { updateMany: mocks.cmWorkUpdateMany },
    profilePhoto: { deleteMany: mocks.profilePhotoDeleteMany },
    signature: { deleteMany: mocks.signatureDeleteMany },
    statusHistory: { updateMany: mocks.statusHistoryUpdateMany },
    user: {
      delete: mocks.userDelete,
      findUniqueOrThrow: mocks.userFindUniqueOrThrow,
    },
  },
}));

vi.mock("../../lib/file-storage", () => ({
  deleteStoredFile: mocks.deleteStoredFile,
  saveProfilePhotoFile: vi.fn(),
  saveSignatureFile: vi.fn(),
}));

vi.mock("../../lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: mocks.verifyPassword,
}));

import {
  deleteManagedUser,
  getManagedUserMutationIssue,
} from "./managed-user-mutation";

const actor = {
  id: "owner-1",
  role: "ADMIN",
  organizationId: "org-1",
  plantId: null,
};

function deleteInput() {
  return { userId: "user-1", adminPassword: "secret" };
}

describe("deleteManagedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUniqueOrThrow.mockResolvedValueOnce({
      id: actor.id,
      passwordHash: "hashed-password",
    });
  });

  it("rejects an invalid owner password before deleting data", async () => {
    mocks.verifyPassword.mockResolvedValue(false);

    const error = await deleteManagedUser(actor as never, deleteInput()).catch(
      (caught) => caught,
    );

    expect(getManagedUserMutationIssue(error)).toBe("invalid-password");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });

  it("removes references, audits the full scope, then cleans stored files", async () => {
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.userFindUniqueOrThrow.mockResolvedValueOnce({
      id: "user-1",
      username: "tech.one",
      fullName: "Tech One",
      department: "Maintenance",
      role: "TECHNICIAN",
      organizationId: "org-1",
      plantId: "plant-1",
      categoryId: "cat-1",
      active: true,
      category: { name: "Mechanical" },
      categories: [{ categoryId: "cat-1" }],
      inventoryScopes: [
        {
          itemKind: "SPARE_PART",
          responsibilityEnabled: true,
          approvalEnabled: false,
        },
      ],
      plant: { name: "RTB" },
      profilePhoto: { storagePath: "profiles/user-1.webp" },
      signature: { storagePath: "signatures/user-1.png" },
    });
    mocks.transaction.mockResolvedValue([]);

    await expect(
      deleteManagedUser(actor as never, deleteInput()),
    ).resolves.toEqual({ userId: "user-1" });

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.userDelete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "DELETE_USER",
        actorId: "owner-1",
        entityId: "user-1",
        beforeJson: expect.stringContaining('"inventoryScopes"'),
      }),
    });
    expect(mocks.deleteStoredFile).toHaveBeenCalledWith(
      "profiles/user-1.webp",
    );
    expect(mocks.deleteStoredFile).toHaveBeenCalledWith(
      "signatures/user-1.png",
    );
  });
});
