drop index if exists public."Category_name_key";
drop index if exists public."Zone_name_key";

create unique index if not exists "Category_organizationId_name_key"
on public."Category" ("organizationId", "name");

create unique index if not exists "Zone_plantId_name_key"
on public."Zone" ("plantId", "name");
