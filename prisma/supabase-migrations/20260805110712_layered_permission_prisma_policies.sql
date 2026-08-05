GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "RolePermissionOverride", "UserPermissionOverride"
TO prisma;

DROP POLICY IF EXISTS "role_permission_override_prisma_server_access"
ON "RolePermissionOverride";

CREATE POLICY "role_permission_override_prisma_server_access"
ON "RolePermissionOverride"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "user_permission_override_prisma_server_access"
ON "UserPermissionOverride";

CREATE POLICY "user_permission_override_prisma_server_access"
ON "UserPermissionOverride"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
