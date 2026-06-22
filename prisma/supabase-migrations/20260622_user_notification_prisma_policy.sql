GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE "UserNotification"
TO prisma;

DROP POLICY IF EXISTS "user_notification_prisma_server_access"
ON "UserNotification";

CREATE POLICY "user_notification_prisma_server_access"
ON "UserNotification"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
