-- Site Admin configurable permissions for multi-plant authorization.
-- Apply to Supabase only when the application code is ready to read/write these permissions.

create table if not exists public."SiteAdminPermission" (
  "id" text primary key,
  "userId" text not null references public."User"("id") on delete cascade on update cascade,
  "plantId" text not null references public."Plant"("id") on delete cascade on update cascade,
  "permissionKey" text not null,
  "enabled" boolean not null default false,
  "grantedById" text references public."User"("id") on delete set null on update cascade,
  "createdAt" timestamp(3) without time zone not null default current_timestamp,
  "updatedAt" timestamp(3) without time zone not null default current_timestamp
);

create unique index if not exists "SiteAdminPermission_userId_plantId_permissionKey_key"
  on public."SiteAdminPermission"("userId", "plantId", "permissionKey");

create index if not exists "SiteAdminPermission_plantId_permissionKey_enabled_idx"
  on public."SiteAdminPermission"("plantId", "permissionKey", "enabled");

create index if not exists "SiteAdminPermission_grantedById_idx"
  on public."SiteAdminPermission"("grantedById");

alter table public."SiteAdminPermission" enable row level security;

-- The Next.js server uses Prisma with DATABASE_URL and server-side authorization.
-- Keep direct Data API access closed until explicit RLS policies are designed.
