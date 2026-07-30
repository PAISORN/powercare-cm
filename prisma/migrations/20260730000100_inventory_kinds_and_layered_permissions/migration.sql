ALTER TABLE "SparePart" ADD COLUMN "itemKind" TEXT NOT NULL DEFAULT 'SPARE_PART';

CREATE TABLE "RolePermissionOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeKey" TEXT NOT NULL,
    "organizationId" TEXT,
    "role" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RolePermissionOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermissionOverride_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPermissionOverride_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "UserPermissionOverride" ("id", "userId", "permissionKey", "decision", "grantedById", "createdAt", "updatedAt")
SELECT 'legacy-' || "id", "userId", "permissionKey", 'ALLOW', "grantedById", "createdAt", "updatedAt"
FROM "SiteAdminPermission"
WHERE "enabled" = 1;

CREATE UNIQUE INDEX "RolePermissionOverride_scopeKey_role_permissionKey_key" ON "RolePermissionOverride"("scopeKey", "role", "permissionKey");
CREATE INDEX "RolePermissionOverride_organizationId_role_idx" ON "RolePermissionOverride"("organizationId", "role");
CREATE INDEX "RolePermissionOverride_role_permissionKey_idx" ON "RolePermissionOverride"("role", "permissionKey");
CREATE UNIQUE INDEX "UserPermissionOverride_userId_permissionKey_key" ON "UserPermissionOverride"("userId", "permissionKey");
CREATE INDEX "UserPermissionOverride_permissionKey_decision_idx" ON "UserPermissionOverride"("permissionKey", "decision");
CREATE INDEX "UserPermissionOverride_grantedById_idx" ON "UserPermissionOverride"("grantedById");
CREATE INDEX "SparePart_plantId_itemKind_active_idx" ON "SparePart"("plantId", "itemKind", "active");
