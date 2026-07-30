ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "itemKind" TEXT NOT NULL DEFAULT 'SPARE_PART';

CREATE TABLE IF NOT EXISTS "RolePermissionOverride" (
    "id" TEXT PRIMARY KEY,
    "scopeKey" TEXT NOT NULL,
    "organizationId" TEXT REFERENCES "Organization"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "decision" TEXT NOT NULL CHECK ("decision" IN ('ALLOW', 'DENY')),
    "grantedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "UserPermissionOverride" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "permissionKey" TEXT NOT NULL,
    "decision" TEXT NOT NULL CHECK ("decision" IN ('ALLOW', 'DENY')),
    "grantedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "UserPermissionOverride" ("id", "userId", "permissionKey", "decision", "grantedById", "createdAt", "updatedAt")
SELECT 'legacy-' || "id", "userId", "permissionKey", 'ALLOW', "grantedById", "createdAt", "updatedAt"
FROM "SiteAdminPermission"
WHERE "enabled" = TRUE
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "RolePermissionOverride_scopeKey_role_permissionKey_key" ON "RolePermissionOverride"("scopeKey", "role", "permissionKey");
CREATE INDEX IF NOT EXISTS "RolePermissionOverride_organizationId_role_idx" ON "RolePermissionOverride"("organizationId", "role");
CREATE INDEX IF NOT EXISTS "RolePermissionOverride_role_permissionKey_idx" ON "RolePermissionOverride"("role", "permissionKey");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPermissionOverride_userId_permissionKey_key" ON "UserPermissionOverride"("userId", "permissionKey");
CREATE INDEX IF NOT EXISTS "UserPermissionOverride_permissionKey_decision_idx" ON "UserPermissionOverride"("permissionKey", "decision");
CREATE INDEX IF NOT EXISTS "UserPermissionOverride_grantedById_idx" ON "UserPermissionOverride"("grantedById");
CREATE INDEX IF NOT EXISTS "SparePart_plantId_itemKind_active_idx" ON "SparePart"("plantId", "itemKind", "active");

ALTER TABLE "RolePermissionOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPermissionOverride" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "RolePermissionOverride" FROM anon, authenticated;
REVOKE ALL ON TABLE "UserPermissionOverride" FROM anon, authenticated;
