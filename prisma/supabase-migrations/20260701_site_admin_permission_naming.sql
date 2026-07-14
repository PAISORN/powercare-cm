do $$
begin
  if to_regclass('public."PlantAdminPermission"') is not null
     and to_regclass('public."SiteAdminPermission"') is null then
    alter table public."PlantAdminPermission" rename to "SiteAdminPermission";
  end if;
end $$;

update public."SiteAdminPermission"
set "permissionKey" = 'manage_site_admin'
where "permissionKey" = 'manage_plant_admin';

update public."SiteAdminPermission"
set "permissionKey" = 'manage_site_admin_permission'
where "permissionKey" = 'manage_plant_admin_permission';
