-- Organization-scoped announcements were removed from the product.
-- Platform announcements are represented by a NULL organizationId.
DELETE FROM "Announcement"
WHERE "organizationId" IS NOT NULL;
