CREATE TABLE "SiteAdminPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SiteAdminPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteAdminPermission_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SiteAdminPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SiteAdminPermission_userId_plantId_permissionKey_key" ON "SiteAdminPermission"("userId", "plantId", "permissionKey");
CREATE INDEX "SiteAdminPermission_plantId_permissionKey_enabled_idx" ON "SiteAdminPermission"("plantId", "permissionKey", "enabled");
CREATE INDEX "SiteAdminPermission_grantedById_idx" ON "SiteAdminPermission"("grantedById");
