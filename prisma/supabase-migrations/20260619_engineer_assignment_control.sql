CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "engineerWorkAssignmentEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSetting" ("id", "engineerWorkAssignmentEnabled", "updatedAt")
VALUES ('global', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "SystemSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SystemSetting" FROM anon, authenticated;
