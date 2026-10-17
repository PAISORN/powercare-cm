BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "User" ADD COLUMN "displayPreferences" TEXT;
COMMIT;
