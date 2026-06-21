GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  "LineDestination",
  "LineEventSetting",
  "LineDeliveryLog",
  "LineGroupDiscovery"
TO prisma;

DROP POLICY IF EXISTS "line_destination_prisma_server_access"
ON "LineDestination";

CREATE POLICY "line_destination_prisma_server_access"
ON "LineDestination"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "line_event_setting_prisma_server_access"
ON "LineEventSetting";

CREATE POLICY "line_event_setting_prisma_server_access"
ON "LineEventSetting"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "line_delivery_log_prisma_server_access"
ON "LineDeliveryLog";

CREATE POLICY "line_delivery_log_prisma_server_access"
ON "LineDeliveryLog"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "line_group_discovery_prisma_server_access"
ON "LineGroupDiscovery";

CREATE POLICY "line_group_discovery_prisma_server_access"
ON "LineGroupDiscovery"
FOR ALL
TO prisma
USING (true)
WITH CHECK (true);
