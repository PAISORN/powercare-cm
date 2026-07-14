ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'User_lastSeenAt_idx'
  ) THEN
    CREATE INDEX "User_lastSeenAt_idx" ON "User"("lastSeenAt");
  END IF;
END $$;
