GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "UserInventoryScope"
TO prisma;

DROP POLICY IF EXISTS "user_inventory_scope_prisma_server_access"
ON "UserInventoryScope";

CREATE POLICY "user_inventory_scope_prisma_server_access"
ON "UserInventoryScope"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
