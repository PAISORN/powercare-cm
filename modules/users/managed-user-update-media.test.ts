import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  discard: vi.fn(),
  finalize: vi.fn(),
  organizationFindUnique: vi.fn(),
  rolePermissionFindMany: vi.fn(),
  stageMedia: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("../../lib/db", () => ({
  db: {
    organization: { findUnique: mocks.organizationFindUnique },
    rolePermissionOverride: { findMany: mocks.rolePermissionFindMany },
    user: {
      findUniqueOrThrow: mocks.userFindUniqueOrThrow,
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("../../lib/file-storage", () => ({
  deleteStoredFile: vi.fn(),
}));

vi.mock("../../lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("../audit/audit-service", () => ({ recordAudit: mocks.audit }));
vi.mock("../organization/organization-scope-service", () => ({
  readOrganizationScope: vi.fn().mockResolvedValue({
    organization: { id: "org-1" },
  }),
}));
vi.mock("./managed-user-media", () => ({
  stageManagedUserMedia: mocks.stageMedia,
}));

import { updateManagedUser } from "./managed-user-mutation";
import type { UpdateManagedUserInput } from "./managed-user-mutation-input";

const actor = {
  id: "owner-1",
  role: "ADMIN",
  organizationId: "org-1",
  plantId: null,
};

const input: UpdateManagedUserInput = {
  userId: "user-1",
  username: "tech.one",
  password: "",
  fullName: "Tech One",
  department: "Maintenance",
  role: "TECHNICIAN",
  organizationId: "org-1",
  plantId: null,
  categoryIds: [],
  inventoryResponsibilityKinds: [],
  inventoryApprovalKinds: [],
  active: true,
  signatureFile: null,
  profilePhotoFile: null,
};

const before = {
  id: "user-1",
  username: "tech.old",
  fullName: "Tech Old",
  department: "Maintenance",
  role: "TECHNICIAN",
  organizationId: "org-1",
  plantId: null,
  categoryId: null,
  active: true,
  categories: [],
  inventoryScopes: [],
  siteAdminPermissions: [],
  userPermissionOverrides: [],
  signature: { storagePath: "signatures/old" },
  profilePhoto: { storagePath: "profiles/old" },
};

describe("updateManagedUser media orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUniqueOrThrow.mockResolvedValue(before);
    mocks.organizationFindUnique.mockResolvedValue({ name: "Organization A" });
    mocks.rolePermissionFindMany.mockResolvedValue([]);
    mocks.stageMedia.mockResolvedValue({
      signature: null,
      profilePhoto: null,
      discard: mocks.discard,
      finalize: mocks.finalize,
    });
    mocks.userUpdate.mockResolvedValue({
      ...before,
      username: input.username,
      fullName: input.fullName,
      signature: before.signature,
      profilePhoto: before.profilePhoto,
    });
  });

  it("discards staged media when the database update fails", async () => {
    mocks.userUpdate.mockRejectedValue(new Error("database failed"));

    await expect(updateManagedUser(actor as never, input)).rejects.toThrow(
      "database failed",
    );

    expect(mocks.discard).toHaveBeenCalledOnce();
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("finalizes replaced media immediately after persistence and before audit", async () => {
    await expect(updateManagedUser(actor as never, input)).resolves.toEqual({
      userId: "user-1",
    });

    expect(mocks.discard).not.toHaveBeenCalled();
    expect(mocks.finalize).toHaveBeenCalledWith({
      signatureStoragePath: "signatures/old",
      profilePhotoStoragePath: "profiles/old",
    });
    expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.finalize.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.audit.mock.invocationCallOrder[0],
    );
  });
});
