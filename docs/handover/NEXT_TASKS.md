# Prioritized Next Tasks

> Priorities are based on production risk, tenant/data safety, and the dependency chain for future Asset/PM/Purchase work.

## P0 - Preserve and Release the Current Workspace

### Task 1: Freeze, back up, and branch the working copy

- **Description:** preserve the large uncommitted implementation before any cleanup or release work.
- **Files involved:** entire repository; especially `prisma/`, `app/`, `components/`, `modules/`, `storage/`, `.env*` references.
- **Suggested implementation:**
  1. Record `git status` and diff statistics.
  2. Back up `prisma/dev.db`, local uploaded files, and Supabase.
  3. Create a `codex/...` feature branch without discarding the working tree.
  4. Exclude secrets, logs, databases, and uploaded bytes from commits.
  5. Split changes into schema/domain, CM tenancy, Store, UI, tests, and docs commits.
- **Complexity:** High.
- **Dependencies:** none; do this first.

### Task 2: Establish database migration parity and production state

- **Description:** prove that local SQLite schema, Supabase Prisma schema, migrations, and live Supabase match.
- **Files involved:** `prisma/schema.prisma`, `prisma/schema.supabase.prisma`, `prisma/migrations/**`, `prisma/supabase-migrations/**`, `scripts/check-development-database.ts`, `docs/Supabase-Setup.md`.
- **Suggested implementation:** generate a model/column/constraint parity check; inventory applied Supabase migrations; apply missing SQL in chronological order after backup; validate code/backfill constraints.
- **Complexity:** High.
- **Dependencies:** Task 1 backup.

### Task 3: Full release verification

- **Description:** verify the exact candidate before Preview/Production.
- **Files involved:** all changed code and tests; `vercel.json`, environment docs.
- **Suggested implementation:** run full Vitest, TypeScript, both Prisma validations, build, Playwright; then multi-role Preview smoke tests for Owner/Organization/Site Admin, Engineer, Technician, Store Officer, Visitor, and public routes.
- **Complexity:** High.
- **Dependencies:** Tasks 1-2.

## P0 - Security and Tenant Isolation

### Task 4: Replace the custom session cookie

- **Description:** current cookie stores an unsigned user ID without explicit expiry/revocation.
- **Files involved:** `lib/session.ts`, `modules/auth/auth-service.ts`, `app/login/page.tsx`, `app/logout/page.tsx`, Prisma schemas/migrations, auth tests.
- **Suggested implementation:** use a signed encrypted cookie or opaque random session ID backed by a `Session` table; add expiry, renewal, logout revocation, session rotation after password reset, and secure production cookie settings.
- **Complexity:** High.
- **Dependencies:** migration parity and release branch.

### Task 5: Harden media route authorization

- **Description:** profile photos, signatures, and logos do not consistently enforce target Organization/Site scope.
- **Files involved:** `app/signatures/[userId]/route.ts`, `app/profile-photo/[userId]/route.ts`, `app/organization-logo/route.ts`, `modules/organization/user-plant-scope.ts`, document/profile tests.
- **Suggested implementation:** introduce a shared media access policy; signatures require self, permitted user management, or a scoped closed-document need; photos require same visible scope; define which logos are intentionally public.
- **Complexity:** Medium.
- **Dependencies:** stable permission semantics.

### Task 6: Audit every mutation for server-side scope

- **Description:** broad Prisma-role RLS means application queries are the primary tenant boundary.
- **Files involved:** page-local Server Actions under `app/`, `modules/organization/**`, `modules/store/**`, `modules/cm-work/**`, `modules/users/**`.
- **Suggested implementation:** create a mutation checklist/test helper; assert Organization/Site before loading or writing targets; add negative cross-tenant tests for every action group.
- **Complexity:** High.
- **Dependencies:** none, but easiest on release branch.

### Task 7: Review Supabase RLS policy completeness

- **Description:** newer tables may lack explicit deployed RLS/grants; current Prisma policies are broad.
- **Files involved:** `prisma/supabase-migrations/**`, [DATABASE.md](./DATABASE.md).
- **Suggested implementation:** query live `pg_class`/`pg_policies`; verify every public-schema table; add corrective migration for missing tables; document whether server-gateway RLS remains the intended ADR.
- **Complexity:** Medium.
- **Dependencies:** Supabase access and Task 2.

## P1 - Workflow Reliability

### Task 8: Add end-to-end multi-tenant workflow tests

- **Description:** unit/source tests are broad, but browser E2E for complete tenant boundaries is limited.
- **Files involved:** `tests/`, `scripts/run-e2e.ps1`, seed helpers, auth/scope modules.
- **Suggested implementation:** seed two Organizations and multiple Sites; test public request, claim restrictions, Engineer review, closure print, Store request approval/partial issue/not-enough-stock, and cross-tenant denial.
- **Complexity:** High.
- **Dependencies:** stable test seed and session solution decision.

### Task 9: Harden stock and numbering concurrency

- **Description:** sequences and stock must remain correct during simultaneous requests.
- **Files involved:** `modules/store/store-numbering.ts`, `store-issue-prisma.ts`, `store-receive-prisma.ts`, `store-adjustment-prisma.ts`, Prisma schema/migrations.
- **Suggested implementation:** test PostgreSQL concurrent operations; use row locks/serializable retry or atomic upsert increments; add idempotency keys for public/internal submissions; prevent negative stock at DB/service boundary.
- **Complexity:** High.
- **Dependencies:** PostgreSQL integration test environment.

### Task 10: Complete Store operational controls

- **Description:** mature the Store foundation for production warehouse use.
- **Files involved:** `app/inventory/**`, `components/store/**`, `modules/store/**`.
- **Suggested implementation:** QR/barcode scan, Excel master/stock import with preview, stock count/reconciliation, transfer between Stores, reservation for approved issues, movement reversal rather than deletion, and stronger audit reporting.
- **Complexity:** High.
- **Dependencies:** Task 9.

## P1 - Maintainability

### Task 11: Split oversized page files

- **Description:** several pages mix queries, authorization, Server Actions, and large UI trees.
- **Files involved:** `app/activities/page.tsx`, `app/work/[id]/page.tsx`, `app/admin/organization/page.tsx`, `app/admin/users/page.tsx`, inventory pages.
- **Suggested implementation:** extract `actions.ts`, scoped query modules, view models, and focused components while preserving route behavior. Keep domain logic in `modules/`.
- **Complexity:** High.
- **Dependencies:** E2E/focused regression tests.

### Task 12: Generate permission documentation/tests from one source

- **Description:** large hand-maintained permission maps can drift from menus and documentation.
- **Files involved:** `modules/auth/site-admin-permissions.ts`, `components/app-nav-links.tsx`, permission tests, this handover package.
- **Suggested implementation:** expose metadata for permission label/group/risk; generate matrix snapshots; assert every protected navigation item has a server permission check.
- **Complexity:** Medium.
- **Dependencies:** permission model stable.

### Task 13: Resolve Site/Plant terminology safely

- **Description:** UI uses Site while internal schema uses Plant and legacy `PLANT_ADMIN` remains.
- **Files involved:** broad schema/modules/routes/docs.
- **Suggested implementation:** write an ADR; first migrate role data to `SITE_ADMIN`; then add compatibility adapters; only rename database models/columns in a dedicated, reversible migration if business value justifies it.
- **Complexity:** High.
- **Dependencies:** production data audit and release stability.

### Task 14: Repair encoding and stale documentation

- **Description:** older files contain mojibake or obsolete single-site assumptions.
- **Files involved:** root `Architecture.md`, selected `docs/*.md`, Thai source strings discovered by browser/tests.
- **Suggested implementation:** preserve UTF-8, replace corrupted strings from product-approved Thai copy, mark superseded docs, and link to this package.
- **Complexity:** Medium.
- **Dependencies:** none.

## P2 - Observability and Operations

### Task 15: Add production observability

- **Description:** establish evidence for performance and failures.
- **Files involved:** Vercel configuration, logging wrappers, LINE delivery, Store/CM services.
- **Suggested implementation:** structured logs with correlation ID and tenant IDs; Vercel Speed Insights/Web Analytics; error monitoring; alert on failed LINE jobs, cron failure, stock transaction failure, and DB latency.
- **Complexity:** Medium.
- **Dependencies:** stable release.

### Task 16: Automate backup/restore drills

- **Description:** backup scripts exist, but recovery evidence is more important than backup existence.
- **Files involved:** `scripts/backup-supabase.ps1`, `docs/Backup-Restore.md`, operational runbook.
- **Suggested implementation:** scheduled backup policy, checksum/encryption/retention, quarterly restore into isolated Supabase project, documented RTO/RPO and owner.
- **Complexity:** Medium.
- **Dependencies:** production ownership and credentials.

### Task 17: Performance and query review

- **Description:** large dashboards/tables and server-side direct queries will grow with tenants.
- **Files involved:** `modules/dashboard/**`, `modules/reports/**`, `modules/members/**`, `modules/store/**`, `lib/query-cache.ts`, schema indexes.
- **Suggested implementation:** capture production query timings; remove N+1 patterns; paginate at DB; add targeted indexes; define cache tags/invalidation; avoid loading 12-month/annual detail rows when aggregates suffice.
- **Complexity:** Medium-High.
- **Dependencies:** observability.

## P3 - Product Expansion

### Task 18: Asset and Equipment Registry

- **Description:** replace placeholders with Site-scoped asset hierarchy and equipment records.
- **Files involved:** new `modules/assets/`, `app/assets/`, schemas/migrations, navigation.
- **Suggested implementation:** Asset/Equipment/Location models, QR, status, criticality, parent-child hierarchy, documents, and CM linkage.
- **Complexity:** High.
- **Dependencies:** tenancy/security/release foundation.

### Task 19: Preventive Maintenance and Meter Reading

- **Description:** add plans, schedules, checklists, meter readings, and generated PM work.
- **Files involved:** new modules/routes/models; shared work/activity/calendar components.
- **Suggested implementation:** define PM state machine separately from CM; schedule generation must be idempotent; integrate parts reservation and My Activities.
- **Complexity:** Very High.
- **Dependencies:** Asset Registry.

### Task 20: Purchase Request and Purchase Order

- **Description:** replenish inventory through governed procurement.
- **Files involved:** new purchase modules/routes/models; Store receive integration.
- **Suggested implementation:** Supplier, PR, approval chain, PO, goods receipt, price history, and budget/accounting references. Do not make PO receipt directly mutate stock without an auditable receipt transaction.
- **Complexity:** Very High.
- **Dependencies:** mature inventory and organization approval model.

## Suggested Execution Order

```text
1 -> 2 -> 3
       -> 4, 5, 6, 7
       -> 8 -> 11, 12, 13
       -> 9 -> 10
       -> 15 -> 17
       -> 18 -> 19
       -> 20
```
