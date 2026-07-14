ALTER TABLE "PlantAdminPermission" RENAME TO "SiteAdminPermission";

UPDATE "SiteAdminPermission"
SET "permissionKey" = 'manage_site_admin'
WHERE "permissionKey" = 'manage_plant_admin';

UPDATE "SiteAdminPermission"
SET "permissionKey" = 'manage_site_admin_permission'
WHERE "permissionKey" = 'manage_plant_admin_permission';
