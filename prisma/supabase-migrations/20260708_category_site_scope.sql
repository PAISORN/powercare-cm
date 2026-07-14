alter table public."Category"
  add column if not exists "plantId" text;

alter table public."Category"
  add constraint "Category_plantId_fkey"
  foreign key ("plantId") references public."Plant"("id")
  on update cascade on delete set null;

update public."Category"
set "plantId" = (
  select p."id"
  from public."Plant" p
  where p."organizationId" = public."Category"."organizationId"
  order by p."createdAt" asc
  limit 1
)
where "plantId" is null
  and "organizationId" is not null;

create unique index if not exists "Category_plantId_name_key"
  on public."Category"("plantId", "name");

create index if not exists "Category_plantId_active_idx"
  on public."Category"("plantId", "active");
