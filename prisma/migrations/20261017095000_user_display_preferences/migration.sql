-- Account-owned appearance settings. Existing accounts retain a nullable value
-- and receive application defaults until their first explicit save.
ALTER TABLE "User" ADD COLUMN "displayPreferences" TEXT;
