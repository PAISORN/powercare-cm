alter table public."Plant" add column if not exists "maxUsers" integer;
alter table public."Plant" add column if not exists "maxWorkRequests" integer;

create table if not exists public."UserCategory" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade on update cascade,
  "categoryId" text not null references public."Category"("id") on delete cascade on update cascade,
  "createdAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "UserCategory_userId_categoryId_key"
  on public."UserCategory" ("userId", "categoryId");

create index if not exists "UserCategory_categoryId_idx"
  on public."UserCategory" ("categoryId");

insert into public."UserCategory" ("id", "userId", "categoryId", "createdAt")
select gen_random_uuid()::text, "id", "categoryId", current_timestamp
from public."User"
where "categoryId" is not null
on conflict ("userId", "categoryId") do nothing;

alter table public."UserCategory" enable row level security;

revoke all on table public."UserCategory" from anon, authenticated;
grant select, insert, update, delete on table public."UserCategory" to prisma;

drop policy if exists "user_category_prisma_server_access" on public."UserCategory";
create policy "user_category_prisma_server_access"
on public."UserCategory"
for all
to prisma
using (true)
with check (true);
