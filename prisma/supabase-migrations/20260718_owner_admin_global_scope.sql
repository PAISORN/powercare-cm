-- Owner Admin operates across every organization and site.
-- Keep its tenant scope empty so UI and server authorization treat it as global.
UPDATE "User"
SET
  "organizationId" = NULL,
  "plantId" = NULL
WHERE "role" = 'ADMIN';
