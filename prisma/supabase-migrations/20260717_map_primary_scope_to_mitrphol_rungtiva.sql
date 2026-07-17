-- Keep deterministic primary IDs so existing foreign keys remain valid while
-- presenting the approved production organization and site names.
UPDATE "Organization"
SET
  "slug" = 'mitrphol',
  "name" = 'MITRPHOL',
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'primary';

UPDATE "Plant"
SET
  "code" = 'rungtiva',
  "inventoryCode" = 'RTB',
  "name" = 'RUNGTIVA',
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'primary-plant'
  AND "organizationId" = 'primary';

UPDATE "OrganizationProfile"
SET
  "companyName" = 'MITRPHOL',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "organizationId" = 'primary';

UPDATE "PlantProfile"
SET
  "companyName" = 'RUNGTIVA',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "plantId" = 'primary-plant';
