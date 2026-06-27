ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Signature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfilePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Zone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CmWork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CmNumberSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SlaSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "User",
  "Signature",
  "ProfilePhoto",
  "Category",
  "Zone",
  "CmWork",
  "CmNumberSequence",
  "StatusHistory",
  "AuditEvent",
  "SlaSetting",
  "SystemSetting",
  "Announcement"
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "User",
  "Signature",
  "ProfilePhoto",
  "Category",
  "Zone",
  "CmWork",
  "CmNumberSequence",
  "StatusHistory",
  "AuditEvent",
  "SlaSetting",
  "SystemSetting",
  "Announcement"
TO prisma;

DROP POLICY IF EXISTS "user_prisma_server_access" ON "User";
CREATE POLICY "user_prisma_server_access"
ON "User"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "signature_prisma_server_access" ON "Signature";
CREATE POLICY "signature_prisma_server_access"
ON "Signature"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "profile_photo_prisma_server_access" ON "ProfilePhoto";
CREATE POLICY "profile_photo_prisma_server_access"
ON "ProfilePhoto"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "category_prisma_server_access" ON "Category";
CREATE POLICY "category_prisma_server_access"
ON "Category"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "zone_prisma_server_access" ON "Zone";
CREATE POLICY "zone_prisma_server_access"
ON "Zone"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "cm_work_prisma_server_access" ON "CmWork";
CREATE POLICY "cm_work_prisma_server_access"
ON "CmWork"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "cm_number_sequence_prisma_server_access" ON "CmNumberSequence";
CREATE POLICY "cm_number_sequence_prisma_server_access"
ON "CmNumberSequence"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "status_history_prisma_server_access" ON "StatusHistory";
CREATE POLICY "status_history_prisma_server_access"
ON "StatusHistory"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "audit_event_prisma_server_access" ON "AuditEvent";
CREATE POLICY "audit_event_prisma_server_access"
ON "AuditEvent"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "sla_setting_prisma_server_access" ON "SlaSetting";
CREATE POLICY "sla_setting_prisma_server_access"
ON "SlaSetting"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "system_setting_prisma_server_access" ON "SystemSetting";
CREATE POLICY "system_setting_prisma_server_access"
ON "SystemSetting"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "announcement_prisma_server_access" ON "Announcement";
CREATE POLICY "announcement_prisma_server_access"
ON "Announcement"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
