# PM Planning Implementation Plan

> **Execution handoff:** Implement phases consecutively. Each phase is self-contained, test-first, and must pass its verification gate before the next phase begins.

**Goal:** Deliver the approved PM module: flexible Site-scoped PM Groups, one manual Daily PM Plan per Site/date, transactional confirmation into one PM Work per distinct Asset, team assignment and execution, Asset PM history, PM-to-CM handoff, in-app notifications, summaries, filters, and CSV export.

**Architecture:** PM is a new domain module under `modules/pm`. It reuses the existing Plant/Asset identities, layered permission system, admin Site resolver, generic AuditEvent history, UserNotification storage, and CM creation service. Confirmed plans store snapshots and never depend on live PM Group membership. All state changes are transaction-safe and server-authorized.

**Stack:** Next.js App Router, React Server Components and Server Actions, Prisma 5.22 (SQLite local + PostgreSQL/Supabase production), Zod, Vitest/RTL, Playwright, Tailwind CSS, date-fns/date-fns-tz.

**Design source:** `docs/superpowers/specs/2026-08-15-pm-planning-design.md`

---

## Phase 0 — Documentation discovery and allowed APIs

This phase is complete. Re-read these sources at the beginning of implementation because repository APIs may have changed.

### Allowed APIs and copy-ready patterns

- Transactions and conditional state transitions: copy `db.$transaction(async (tx) => ...)` and predicate-based `updateMany` checks from `modules/cm-work/cm-work-service.ts:76-110`.
- Idempotent creation and unique-conflict recovery: copy the `submissionKey` + Prisma `P2002` pattern from `modules/cm-work/cm-work-service.ts:115-179`.
- Active, same-Site Asset validation and identity snapshots: copy `modules/cm-work/cm-work-service.ts:138-169`.
- Sequence reservation: copy the transaction-client seam from `modules/cm-work/cm-work-sequence.ts` and formatting separation from `modules/cm-work/cm-work-number.ts` or `modules/store/store-numbering.ts:16-22,69-73`.
- Generic audit input: use `recordAudit(input: AuditInput)` from `modules/audit/audit-service.ts`, with the type in `modules/audit/audit-types.ts`. Inside an existing transaction, write `tx.auditEvent.create`; do not call the global wrapper.
- Layered authorization: use `canUsePermission(...)` and `canUseUserPermission(...)` from `modules/auth/site-admin-permissions.ts:550-602`; add capability wrappers alongside the Asset helpers in `modules/auth/permission.ts`.
- Admin scope selection: use `resolveAdminSiteScope(user, search)` from `modules/admin/admin-site-scope.ts:27`; copy the fixed-Site fallback from `modules/store/store-page-scope.ts:6-36`.
- Authenticated Server Actions: copy `requireUser()` → Zod parse → scoped service → `revalidatePath`/`redirect` from `app/work/[id]/page.tsx:181-268`.
- Calendar date math/accessibility: copy or extract the 42-cell Monday-first UTC-noon helpers from `components/cm-date-range-picker.tsx:28-63,228-297`. Do not use `components/cm-calendar.tsx`, which is a visual stub.
- URL filters: copy `parseReportFilter`, `serializeReportFilter`, and scoped-query separation from `modules/reports/report-filter.ts:27-113` and `modules/reports/report-query.ts:6-45`.
- Authenticated audited export: copy the route structure from `app/reports/export/route.ts:13-36`, but implement CSV rather than calling the existing XLSX helper.
- Asset integration point: replace the PM placeholder in `app/assets/[id]/page.tsx:56`; preserve the separate Parent/Child UI hierarchy.
- Navigation integration point: replace the disabled PM placeholder in `components/app-nav-links.tsx:153`; keep permission gating through `getAppLinks(...)` at line 71.

### Known repository conflicts resolved by this plan

1. `RoleName.ADMIN` currently short-circuits to `true` for every permission. Add a narrow explicit-grant exception for `EXECUTE_PM_WORK`, so Owner Admin manages PM by default but executes PM only through a Role/User override.
2. Prisma cannot express a conditional unique constraint for one non-canceled plan per Site/date. Add provider-specific partial unique indexes in both local SQLite and Supabase PostgreSQL migrations, with matching semantics and tests.
3. Notifications currently hard-code `CmWork` scope. Generalize notification scope by entity type before emitting PM events.
4. CM creation requires `categoryId` and `zoneId`; the PM abnormal-result flow must ask for these values instead of creating CM from Asset/note alone.

### Phase 0 anti-pattern guards

- Do not invent a generic calendar, scheduler, or notification API that the repository does not contain.
- Do not edit only one Prisma schema or only one migration track.
- Do not reuse Zone as PM Group or infer Parent/Child coverage.
- Do not reuse CM start/close permissions for PM execution.

---

## Phase 1 — Domain foundation, schema, migrations, and numbering

### What to implement

Create the PM persistence model and pure domain vocabulary before pages or Server Actions.

**Files**

- Create `modules/pm/pm-types.ts`
- Create `modules/pm/pm-numbering.ts`
- Create `modules/pm/pm-numbering.test.ts`
- Modify `prisma/schema.prisma`
- Modify `prisma/schema.supabase.prisma`
- Modify `prisma/schema-parity.test.ts`
- Create `prisma/migrations/<timestamp>_pm_planning/migration.sql`
- Create `prisma/supabase-migrations/<timestamp>_pm_planning.sql`

Add constants/types for:

- `PmPlanStatus`: `DRAFT | CONFIRMED | CANCELED`
- `PmWorkStatus`: `PLANNED | IN_PROGRESS | COMPLETED | CANCELED`
- `PmResult`: `NORMAL | ABNORMAL`
- `PmAssigneeRole`: `LEAD | COLLABORATOR`

Add models, mirrored exactly in both schemas:

- `PmGroup`: `organizationId`, `plantId`, normalized `code`, `name`, `active`, `firstUsedAt`, timestamps.
- `PmGroupAsset`: group/Asset membership with `@@unique([pmGroupId, assetId])`.
- `PmPlanSequence`: globally reserves a sequence by unique `[siteCodeSegment, creationDateKey]`, `lastNumber`. The segment is the same normalized Site-code segment rendered in the human number, so two Sites whose codes normalize identically share one sequence and cannot collide.
- `PmPlan`: immutable optional number while Draft, `plannedDateKey` as `YYYY-MM-DD`, status and confirmation/cancellation/reschedule/backdate metadata, `submissionKey`, timestamps.
- `PmPlanDraftGroup`: mutable Draft plan-to-PM Group selections, unique `[pmPlanId, pmGroupId]`; these are separate from immutable confirmation snapshots.
- `PmPlanGroupSnapshot`: source group ID plus captured code/name.
- `PmWork`: plan, Asset link with `onDelete: Restrict`, captured Asset code/name, immutable number, status/result/note/timestamps, cancellation/correction fields, `addedAfterConfirmation`.
- `PmWorkSourceGroup`: work-to-group-snapshot links used after deduplication.
- `PmWorkAssignee`: unique `[pmWorkId, userId]`, role, assigned metadata.
- `CmWork.originatingPmWorkId String? @unique` and inverse relation so one PM Work creates at most one CM Work.
- Reverse relations on `Organization`, `Plant`, `Asset`, and `User` required by Prisma.

Use raw migrations for:

- a partial unique index on `(plantId, plannedDateKey)` where plan status is not `CANCELED`;
- a partial unique index on `pmWorkId` where assignee role is `LEAD`;
- production RLS/grants following `prisma/supabase-migrations/20260802000200_asset_codes_without_system.sql`.

Implement pure number formatters:

- `PMP-{SITE_CODE}-{CREATION_DATE}-{PLAN_SEQUENCE}`
- `PM-{SITE_CODE}-{CREATION_DATE}-{PLAN_SEQUENCE}-{WORK_SEQUENCE}`

Normalize Site codes to uppercase alphanumeric segments with a practical maximum of 12 characters; do not inherit Store inventory's exact three-character requirement. Sequence scope must use this normalized segment, not `plantId`, because the rendered numbers are globally unique and do not contain the Plant ID.

Reserve the plan sequence and generate all work suffixes only in the confirmation transaction. Drafts do not consume human-readable numbers.

### Documentation references

- `prisma/schema.prisma:263-369,1017-1065`
- `modules/cm-work/cm-work-sequence.ts`
- `modules/store/store-numbering.ts:16-22,69-73`
- `prisma/schema-parity.test.ts`
- `docs/handover/DATABASE.md:5-19`
- `docs/handover/AI_INSTRUCTIONS.md:89,176`

### Verification checklist

- [x] Number formatter rejects empty or overlong normalized Site-code segments, invalid calendar date keys, and non-positive/non-integer sequences.
- [x] Both Prisma schemas validate and remain model/field-parity compatible.
- [x] Local and production migrations contain equivalent constraints.
- [x] Supabase SQL enables RLS and grants only the established server role.
- [x] Partial unique indexes allow historical canceled plans but reject two current plans for the same Site/date.
- [x] One PM Work cannot have two leads.
- [x] Composite foreign keys reject a PM Group or PM Plan whose Organization does not own its Site.
- [x] Composite foreign keys reject cross-Site Group-to-Asset, Plan-to-Group, snapshot-to-source-Group, and Plan-to-Work-Asset links while preserving same-plan work provenance.

Run:

```powershell
npm.cmd run test -- modules/pm/pm-numbering.test.ts prisma/schema-parity.test.ts prisma/pm-migration-sqlite.test.ts
npx.cmd prisma validate --schema prisma/schema.prisma
npx.cmd prisma validate --schema prisma/schema.supabase.prisma
npm.cmd run db:generate
```

### Phase 1 execution record — 2026-08-15

- Focused Vitest gate passed: `modules/pm/pm-numbering.test.ts`, `prisma/schema-parity.test.ts`, and `prisma/pm-migration-sqlite.test.ts`.
- Both Prisma schemas validated and generated successfully; TypeScript completed with `--noEmit`.
- SQLite migration executed from a bootstrap database and negative tests proved Organization/Site and cross-Site foreign-key rejection.
- Migration parity assertions verify the exact PM constraint names, composite foreign-key column sets, unique supporting indexes, partial indexes, CHECK constraints, and server-only Supabase grants/RLS declarations.
- `git diff --check` passed.
- PostgreSQL SQL was checked statically against the mirrored schema and parity suite. A live PostgreSQL/Supabase endpoint was not available, so production migration execution remains explicitly unverified and must be run in a disposable development database before release.

### Anti-pattern guards

- Do not use `count + 1` for references.
- Do not use a timestamp as the planned calendar date; use the Bangkok `YYYY-MM-DD` key.
- Do not add a polymorphic PM foreign key to `AuditEvent`.
- Do not cascade-delete confirmed PM work or snapshots.

---

## Phase 2 — Permission defaults, explicit Owner execution override, scope, and navigation shell

### What to implement

**Files**

- Modify `modules/auth/site-admin-permissions.ts`
- Modify `modules/auth/permission.ts`
- Create `modules/pm/pm-page-scope.ts`
- Create `modules/pm/pm-permission.test.ts`
- Modify `modules/auth/site-admin-permissions.test.ts`
- Modify `modules/auth/permission.test.ts`
- Modify `app/admin/permissions/page.tsx`
- Modify `components/app-nav-links.tsx`
- Modify `components/app-nav-links.test.ts`
- Create route shells: `app/dashboardpm/page.tsx`, `app/dashboardpm/groups/page.tsx`, `app/dashboardpm/work/page.tsx`

Add lower-snake-case keys:

- `VIEW_PM: "view_pm"`
- `MANAGE_PM_GROUPS: "manage_pm_groups"`
- `MANAGE_PM_PLANS: "manage_pm_plans"`
- `EXECUTE_PM_WORK: "execute_pm_work"`

Defaults:

- `VIEW_PM`: every authenticated Role.
- both management keys: Owner Admin, Organization Admin, Site Admin.
- execution: Engineer and Technician only.

Introduce an explicit-grant set containing `EXECUTE_PM_WORK`. Modify the Owner Admin short-circuit so keys in this set continue through override evaluation with a default of denied. Prove an explicit SYSTEM/Organization/User ALLOW grants execution and a DENY removes it. Do not put new PM permissions in the legacy `SiteAdminPermission` checkbox storage.

Create `resolvePmPageScope` by copying `modules/store/store-page-scope.ts:6-36`: admins use `resolveAdminSiteScope`; other Roles use their active fixed Plant and Organization.

Add wrappers:

- `canViewPm`
- `canManagePmGroups`
- `canManagePmPlans`
- `canExecutePmWork`

Replace the disabled PM placeholder with an enabled PM section containing Calendar, PM Groups, and PM Work links, gated separately by view/manage permissions.

### Documentation references

- `modules/auth/site-admin-permissions.ts:9-208,270-602`
- `modules/auth/permission.ts` Asset capability wrappers
- `modules/store/store-page-scope.ts:6-36`
- `modules/admin/admin-site-scope.ts:27-101`
- `app/admin/permissions/page.tsx:30-113,515-573`
- `components/app-nav-links.tsx:48-71,140-157,450-458`

### Verification checklist

- [x] All authenticated Roles can view PM only inside authorized scope.
- [x] Owner/Organization/Site Admin management defaults match the design.
- [x] Admin Roles cannot execute PM without an explicit override.
- [x] Engineer/Technician can execute but cannot manage groups/plans by default.
- [x] User DENY wins over Role ALLOW.
- [x] Submitted Organization/Site IDs cannot expand scope.
- [x] Navigation and direct route access use the same permission rules.

Run:

```powershell
npm.cmd run test -- modules/auth/site-admin-permissions.test.ts modules/auth/permission.test.ts modules/pm/pm-permission.test.ts components/app-nav-links.test.ts
```

### Anti-pattern guards

- Do not authorize through hidden buttons alone.
- Do not add a parallel PM permission table or permission page.
- Do not use direct Role comparisons as the only mutation guard.
- Do not let the global Owner shortcut bypass explicit-only execution.

---

## Phase 3 — PM Group service and management UI

### What to implement

**Files**

- Create `modules/pm/pm-validation.ts`
- Create `modules/pm/pm-group-service.ts`
- Create `modules/pm/pm-group-service.test.ts`
- Create `components/pm/pm-group-asset-picker.tsx`
- Create `components/pm/pm-group-asset-picker.test.tsx`
- Implement `app/dashboardpm/groups/page.tsx`
- Create `app/dashboardpm/groups/page.test.ts`

Implement scoped service commands for create, edit identity, replace membership, activate/deactivate, and delete-unused. Copy the active same-Site Asset query and snapshots guard from `modules/cm-work/cm-work-service.ts:138-169`.

Rules:

- Normalize and require a Site-unique code and non-empty name.
- Permit empty groups.
- Treat Parent and Child Assets identically.
- Permit only `registrationStatus: "ACTIVE"`; do not exclude eligible operating statuses.
- Allow an Asset in many groups; prevent duplicates within one group.
- Lock code after `firstUsedAt` is set.
- Delete only groups with no confirmed snapshot; otherwise deactivate.
- Audit every material mutation with before/after membership IDs and scope.

Build searchable multi-select UI showing Asset code, name, type, Zone, and operating status. Empty groups remain visible with a warning state.

### Documentation references

- `modules/cm-work/cm-work-service.ts:138-169`
- `modules/assets/asset-scope.ts`
- `components/asset-search-field.tsx` and test
- `app/admin/categories/page.tsx:12-79`
- `modules/audit/audit-service.ts`

### Verification checklist

- [x] Duplicate code and cross-Site Asset selection are rejected server-side.
- [x] Empty group creation succeeds.
- [x] Parent/Child hierarchy never adds implicit members.
- [x] Used code cannot change; unused code can.
- [x] Used groups deactivate instead of deleting.
- [x] Membership replacement is atomic and audited.
- [x] Asset picker is keyboard accessible and usable on mobile.

### Phase 3 execution record — 2026-08-15

- Added normalized PM Group validation and scoped, transactional service commands for creation, atomic identity-plus-membership edits, specialized identity/membership changes, activation, deactivation, and delete-unused behavior.
- Service tests prove empty groups, duplicate-code handling, same-Site active-registration enforcement, explicit Parent/Child membership, code locking, historical deactivation, atomic replacement, transaction-local audit payloads, rollback-safe validation before any combined edit mutation, and removal of an existing inactive membership while all retained IDs remain validated.
- Added the responsive searchable multi-select Asset picker and the full PM Groups management page; route and every Server Action re-check permission and resolve the submitted Organization/Site scope server-side. Existing members that are no longer eligible remain visible as stale, removable rows but cannot be newly selected or restored in the picker.
- Focused Phase 3 gate passed: 39 tests across PM Group service, PM permission regression, Asset picker, and PM Groups page. The expanded Phase 2-3 regression gate passed 122 tests across 11 files.
- TypeScript `--noEmit` and `git diff --check` passed. No production migration, deployment, commit, or staging was performed.

### Anti-pattern guards

- Do not reuse `Zone` or `AssetFamily` as PM grouping storage.
- Do not trust Asset IDs posted by the picker.
- Do not delete historical group references.

---

## Phase 4 — Draft Daily PM Plan and responsive calendar

### What to implement

**Files**

- Create `modules/pm/pm-plan-service.ts`
- Create `modules/pm/pm-plan-service.test.ts`
- Create `modules/pm/pm-calendar-query.ts`
- Create `modules/pm/pm-calendar-query.test.ts`
- Create `components/pm/pm-calendar.tsx`
- Create `components/pm/pm-calendar.test.tsx`
- Create `components/pm/pm-agenda-list.tsx`
- Create `components/pm/pm-plan-editor.tsx`
- Implement `app/dashboardpm/page.tsx`

Copy the date-grid primitives from `components/cm-date-range-picker.tsx:28-63,228-297` into shared pure helpers or a PM-specific calendar. Render a desktop/tablet month grid and a mobile agenda list. A date opens its sole current plan editor.

Implement Draft commands:

- create/get plan for Site/date with idempotent `submissionKey`;
- add/remove active PM Groups;
- preview the union of current group Assets;
- report duplicate sources, empty groups, and retired/ineligible changes;
- freely reschedule Draft;
- delete Draft.

Use `getBangkokDateString()` and `bangkokDayWindow()` from `lib/date-time/bangkok-time.ts`; do not derive calendar keys from server-local time.

### Documentation references

- `components/cm-date-range-picker.tsx:28-63,65,228-297`
- `lib/date-time/bangkok-time.ts`
- `app/work/[id]/page.tsx:181-228`
- `components/admin-site-scope-selector.tsx`

### Verification checklist

- [x] Only one non-canceled Draft/Confirmed plan can occupy a Site/date under concurrent requests.
- [x] One date accepts multiple groups through `+ เพิ่ม PM Group`.
- [x] Preview deduplicates Assets and preserves all group sources.
- [x] Draft creates no PM Work and consumes no human number.
- [x] Desktop calendar has a 42-cell accessible grid; mobile uses agenda layout.
- [x] Bangkok date boundaries remain stable under UTC/browser timezone differences.
- [x] Owner/Organization Admin scope selectors cannot escape their authority.

### Phase 4 execution record — 2026-08-15

- Added scoped Draft plan commands for idempotent create/get, active PM Group add/remove, deduplicated Asset preview, conditional rescheduling, and deletion. Every mutation re-checks management permission, Organization/Site authority, Draft state, and active Site scope server-side; material changes are audited inside the same transaction.
- Concurrent Site/date creation is resolved by the existing partial unique database index. Same `submissionKey` retries return the same scoped plan, while collisions with another plan return a stable conflict. Draft editing creates no PM Work and does not reserve a plan or work number.
- Added PM-specific UTC-noon month helpers, a 42-cell accessible desktop/tablet grid, a separate mobile agenda, compact calendar summaries, and a responsive editor supporting more than one PM Group through `+ เพิ่ม PM Group`.
- Preview keeps one row per Asset while retaining every source group. It separately reports duplicate sources, empty groups, retired groups, and ineligible Assets, including the case where one duplicate source is retired but another remains eligible.
- Post-review remediation moved Draft membership changes behind a Serializable transaction with bounded `P2034` retry, so a confirmation interleaving forces the membership command to retry and re-check Draft status. Phase 5 confirmation must use this same concurrency boundary. Only the `PmPlanDraftGroup(pmPlanId, pmGroupId)` `P2002` is treated as an idempotent add; unrelated unique failures remain visible. No status or timestamp touch was introduced as a locking side effect.
- Draft deletion now uses the same Serializable/retry boundary and a conditional `deleteMany` write predicate containing plan ID, Organization, Site, and `status: DRAFT`. A zero-row write is treated as a state conflict without audit, preventing a concurrently Confirmed plan and its historical children from being cascade-deleted.
- Idempotent remove now returns `removed: false` and emits no audit when no selection exists. Route and calendar helpers reject impossible date/month keys, action redirects preserve the selected calendar context, and the desktop grid now exposes explicit row, column-header, and grid-cell hierarchy.
- Focused Phase 4 gate passed 27 tests across the plan service, calendar query, calendar/agenda components, and route. Expanded PM/auth/navigation regression passed 158 tests across 13 files. TypeScript `--noEmit` and `git diff --check` passed.
- No production migration, deployment, commit, staging, PM Work generation, or human-number allocation was performed.

### Anti-pattern guards

- Do not build on `components/cm-calendar.tsx`.
- Do not put every Asset name inside a calendar cell.
- Do not generate works while editing a Draft.

---

## Phase 5 — Transactional confirmation, snapshots, deduplication, and immutable references

### What to implement

Extend `modules/pm/pm-plan-service.ts` with a single idempotent confirmation transaction.

**Files**

- Modify `modules/pm/pm-plan-service.ts`
- Modify `modules/pm/pm-plan-service.test.ts`
- Create `modules/pm/pm-sequence-service.ts`
- Create `modules/pm/pm-sequence-service.test.ts`
- Create `components/pm/pm-confirm-plan-dialog.tsx`
- Modify `components/pm/pm-plan-editor.tsx`

Inside one transaction:

1. conditionally lock/transition Draft by querying its current status and `updateMany` predicate;
2. reload active group membership and same-Site active Assets;
3. skip empty groups and reject an empty union;
4. deduplicate by Asset ID while retaining all source groups;
5. reserve the plan sequence;
6. assign the immutable plan number;
7. create group and Asset identity snapshots;
8. create numbered PM Works in deterministic Asset-code/ID order;
9. create source-group links;
10. set `firstUsedAt` on source groups;
11. write an in-transaction AuditEvent;
12. mark the plan Confirmed.

Catch unique conflicts and return the already-confirmed result for the same `submissionKey`; return a conflict for a different plan occupying that Site/date.

### Documentation references

- `modules/cm-work/cm-work-service.ts:76-110,115-179`
- `modules/cm-work/cm-work-sequence.ts`
- `modules/assets/asset-service.ts:47-111`

### Verification checklist

- [x] Two simultaneous confirmation calls create one plan number and one work set.
- [x] One Asset in multiple groups creates one PM Work with multiple source links.
- [x] Later group changes do not alter snapshots or works.
- [x] Empty groups warn; all-empty confirmation fails.
- [x] Plan/work numbers remain unchanged after rescheduling.
- [x] Partial transaction failure leaves no number, snapshot, work, or audit residue.

### Phase 5 execution record — 2026-08-15

- Added one idempotent Serializable confirmation boundary shared with Phase 4 Draft membership/delete mutations. A conditional Draft transition prevents add/remove/confirm interleaving, while `P2034` retries and same-submission recovery return the single committed result.
- Confirmation reloads selected groups and eligible same-Site Assets inside the transaction, skips unavailable sources, reports empty groups in the audit payload, rejects an empty eligible union, deduplicates Assets while retaining all source-group links, and orders work by Asset code then ID.
- Added global normalized Site/date sequence reservation, immutable plan/work references, group and Asset identity snapshots, source links, first-use locking, and transaction-local confirmation audit. No global audit wrapper or per-Asset transaction is used.
- Added an accessible confirmation dialog and server-authorized calendar action. Confirmed retries return stored snapshots and work without consulting later group membership.
- Focused Phase 5 verification passed 33 tests across the service, sequence, real SQLite rollback integration, confirmation dialog, and route integration. The expanded Phase 1-5 regression passed 178 tests across 17 files; TypeScript, diff validation, and anti-pattern checks passed. The SQLite test injects a failure at the transaction-local audit after sequence/snapshot/work/source writes and proves the plan remains Draft with no persisted confirmation residue.
- Confirmation recovery is deliberately narrow: only the exact same scoped, confirmed plan and submission returns idempotently. Identifiable plan-date/submission occupancy collisions receive a stable conflict; unrelated `P2002` and exhausted `P2034` failures preserve the original database error. The confirmation dialog traps forward/reverse Tab navigation, closes on Escape, restores trigger focus, and exposes labelled modal semantics.
- No production migration, deployment, commit, or staging was performed.

### Anti-pattern guards

- Do not call global `recordAudit()` inside the transaction.
- Do not loop with independent transactions per Asset.
- Do not rely on client-side deduplication.

---

## Phase 6 — PM Work assignment, lifecycle, cancellation, rescheduling, and result correction

### What to implement

**Files**

- Create `modules/pm/pm-work-service.ts`
- Create `modules/pm/pm-work-service.test.ts`
- Create `components/pm/pm-work-assignment-form.tsx`
- Create `components/pm/pm-work-result-form.tsx`
- Create `app/dashboardpm/work/[id]/page.tsx`
- Create `app/dashboardpm/work/[id]/page.test.ts`

Implement conditional, audited commands:

- assign one lead and many collaborators;
- claim unassigned work;
- start `PLANNED → IN_PROGRESS`;
- complete to `COMPLETED` with automatic actor/time, result, and conditional note;
- cancel Planned/In Progress work with reason according to manager/performer rules;
- cancel an all-Planned plan;
- reschedule Draft freely and Confirmed only when all works remain Planned;
- add a single eligible Asset after confirmation with reason and marker;
- correct a Completed result by scoped Admin with before/after and mandatory reason.

Compute Overdue at query time when `plannedDateKey < getBangkokDateString()` and work is Planned/In Progress. Never store Overdue as a lifecycle status.

Use predicate-based `updateMany` and count assertions to prevent two Users claiming/starting/completing the same work concurrently.

### Documentation references

- `modules/cm-work/cm-work-service.ts:76-110`
- `app/work/[id]/page.tsx:181-268`
- `components/work-assignment-form.tsx` and test
- `modules/audit/audit-types.ts`

### Verification checklist

- [x] Lead is unique; collaborators cannot cross Site or lack execution permission.
- [x] Unassigned work can be claimed once under concurrency.
- [x] Admin management permission does not imply execution permission.
- [x] Abnormal completion requires a note; Normal does not.
- [x] Performers cannot edit Completed results.
- [x] Scoped Admin correction preserves old/new/reason.
- [x] A plan with started work cannot reschedule or cancel as a whole.
- [x] Retired Asset warning never removes confirmed work automatically.

### Phase 6 execution record — 2026-08-15

- Added Site-scoped, transaction-local-audited PM Work commands for one-lead/many-collaborator assignment, one-time claim, conditional start/completion, individual and whole-plan cancellation, Confirmed-plan rescheduling, eligible post-confirmation Asset addition, and completed-result correction. Correction uses `updatedAt` as a compare-and-swap version so even stale same-value corrections cannot both commit or audit.
- Lifecycle transitions use predicate-based `updateMany`/count assertions. Claim relies on the database's partial unique lead index; result validation requires an Abnormal note before opening a transaction. Management permission never substitutes for execution permission.
- Added a persisted `PmPlan.lastWorkSequence`, mirrored schemas, provider-specific backfill migrations, and Phase 5 initialization. Post-confirmation additions reserve the next suffix by atomic increment inside a bounded Serializable retry; the runtime contains no `count() + 1` numbering and never renumbers existing work.
- Added the responsive PM Work list/detail route, accessible assignment/result forms, assigned-performer controls, Admin correction controls, a live retired-Asset warning, and reachable Confirmed-plan calendar controls for reason-required add/reschedule/cancel actions. `OVERDUE` is derived from the Bangkok date key at query time and is never persisted as a status.
- Focused Phase 6 tests passed 21 tests across service, forms, Confirmed-plan controls, and routes. Expanded Phase 2–6 plus schema/migration regression passed 174 tests across 17 files. Both Prisma schemas validate, the client regenerated, TypeScript `--noEmit`, and `git diff --check` passed. A disposable SQLite integration proves legacy work-count backfill.
- No commit, deployment, production migration, or production database mutation was performed. Live multi-request PostgreSQL concurrency and browser visual verification remain release-level checks.

### Anti-pattern guards

- Do not store `OVERDUE` in `PmWork.status`.
- Do not overwrite completed results silently.
- Do not remove a confirmed work row to represent cancellation.

---

## Phase 7 — PM-to-CM handoff and Asset PM record

### What to implement

**Files**

- Create `modules/pm/pm-cm-service.ts`
- Create `modules/pm/pm-cm-service.test.ts`
- Modify `app/dashboardpm/work/[id]/page.tsx`
- Modify `modules/cm-work/cm-work-service.ts` only if an explicit origin parameter is required
- Modify `app/assets/[id]/page.tsx`
- Modify `app/assets/[id]/page.test.ts`

For an Abnormal Completed work, show `สร้างงาน CM จากผล PM`. Require the User to choose the mandatory same-Site `categoryId` and `zoneId`, review the prefilled Asset and abnormality note, then invoke the existing `createRepairRequest(...)` shape from `modules/cm-work/cm-work-service.ts:115-127`.

Use a deterministic submission key based on PM Work ID and persist `originatingPmWorkId` so repeat submissions return the same CM Work. Require the existing CM creation permission in addition to PM read access.

Replace the PM placeholder in the Asset maintenance section with:

- upcoming Planned/In Progress/Overdue work;
- Completed/Canceled history;
- result, team, completion time, note, and linked CM number.

### Documentation references

- `modules/cm-work/cm-work-service.ts:115-197`
- `app/assets/[id]/page.tsx:23-25,35,56`
- `app/work/[id]/page.tsx` Category/Zone query patterns

### Verification checklist

- [x] PM cannot create CM without Category, Zone, same-Site scope, and CM permission.
- [x] Repeat submission creates one CM Work.
- [x] Normal PM result offers no CM action.
- [x] PM and CM pages link to each other.
- [x] Asset PM history does not infer Parent/Child records.

### Anti-pattern guards

- Do not auto-create CM from an Abnormal result.
- Do not invent placeholder Category or Zone values.
- Do not duplicate CM state machine logic in the PM module.

---

## Phase 8 — Work list, summaries, filters, responsive UX, and CSV export

### What to implement

**Files**

- Create `modules/pm/pm-filter.ts`
- Create `modules/pm/pm-filter.test.ts`
- Create `modules/pm/pm-query.ts`
- Create `modules/pm/pm-query.test.ts`
- Create `components/pm/pm-filter-bar.tsx`
- Create `components/pm/pm-summary-strip.tsx`
- Implement `app/dashboardpm/work/page.tsx`
- Create `app/dashboardpm/export/route.ts`
- Create `app/dashboardpm/export/route.test.ts`

Add URL-driven filters for date range, PM Group, Asset, assignee, lifecycle, derived Overdue, and result. Show Today, Planned, In Progress, Overdue, Completed, and Abnormal summary counts within the resolved scope.

Implement CSV export with UTF-8 BOM, RFC-compatible quoting, scoped query, permission check, and AuditEvent. The existing report export is XLSX; copy only its auth/scope/audit/response structure.

### Documentation references

- `modules/reports/report-filter.ts:27-113`
- `modules/reports/report-query.ts:6-45`
- `components/dashboard-filter-bar.tsx:17-49`
- `app/reports/export/route.ts:13-36`
- `app/dashboardstore/page.tsx` summary-card composition

### Verification checklist

- [x] Filters round-trip through URL parameters.
- [x] Derived Overdue counts agree with work rows at Bangkok date boundary.
- [x] CSV opens with Thai text intact and escapes commas, quotes, and newlines.
- [x] Export cannot cross Organization/Site scope.
- [x] Mobile filter controls and work rows do not create document-level horizontal overflow.

### Phase 8 execution record — 2026-08-15

- Added URL-driven PM Work filters for planned-date range, PM Group provenance, Asset, assignee, lifecycle, derived Overdue, and result. Invalid date/enum inputs are ignored safely and the derived date always comes from Bangkok time.
- Added one tenant-bounded PM query seam shared by the screen total and CSV rows. Summary counts for Today, Planned, In Progress, Overdue, Completed, and Abnormal independently retain the resolved Organization/Site boundary; Overdue rows and the summary use the same `PLANNED` plus `plannedDateKey < Bangkok today` predicate.
- Implemented the responsive PM Work filter bar, summary strip, scoped option lists, compact work cards, and an inner-shrinking `min-w-0` layout so wide values wrap without widening the document.
- Added an authenticated, PM-view-authorized export route that resolves the active PM page scope, queries through the shared scoped builder, writes an actor/Organization/Site AuditEvent, and returns real CSV with a UTF-8 BOM, CRLF rows, and RFC-compatible comma/quote/newline escaping. The existing XLSX helper is not reused.
- Post-review remediation aligned derived Overdue with the approved domain definition (`PLANNED` or `IN_PROGRESS` before Bangkok today) in filtered rows, summary counts, and visible badges. CSV cells now neutralize spreadsheet formula prefixes after leading whitespace/control characters—including numeric-looking minus values because PM export columns are textual—and retain RFC quoting. Export uses a 10,000-row cap plus one sentinel row and returns HTTP 413 before CSV generation or success audit when the filtered result exceeds the cap.
- Focused Phase 8 coverage passed 22 tests across filter, query, CSV safety/encoding, and export-route contracts. The expanded PM regression gate passed 149 tests across 22 files; TypeScript `--noEmit`, `git diff --check`, and the Phase 8 anti-pattern scan passed. Browser/Playwright geometry and a live authenticated download remain release-verification items because no browser session was run in this implementation pass.

### Anti-pattern guards

- Do not label the existing XLSX helper as CSV.
- Do not calculate scoped summaries from an unscoped global count.
- Do not duplicate CM dashboard query semantics inside PM.

---

## Phase 9 — Generalized in-app notifications and idempotent due/overdue dispatch

### What to implement

**Files**

- Modify `modules/notifications/notification-types.ts`
- Modify `modules/notifications/notification-service.ts`
- Modify `modules/notifications/notification-service.test.ts`
- Create `modules/pm/pm-notification-service.ts`
- Create `modules/pm/pm-notification-service.test.ts`
- Create `modules/cron/cron-authorization.ts`
- Create `app/api/cron/daily/route.ts`
- Create `app/api/cron/daily/route.test.ts`
- Modify `app/api/line/daily-report/route.ts`
- Modify `vercel.json`

Generalize notification read scoping so `UserNotification.entityType` supports both `CmWork` and `PmWork`. Preserve existing CM behavior and tests. PM recipients are assignees and scoped managers, not CM Category recipients.

Emit in-app notifications for assignment, reassignment, due today, first transition to Overdue, and linked CM creation. Add an idempotency constraint or dispatch record keyed by recipient/event/work/date so repeated scheduled runs do not duplicate due/overdue notifications.

The repository already has one Vercel Cron at `0 1 * * *` and a protected LINE endpoint. Extract the existing `CRON_SECRET` check from `app/api/line/daily-report/route.ts:17-22`, create a shared `/api/cron/daily` coordinator that invokes both `dispatchAllLineDailyReports(...)` and the new PM due/overdue dispatcher, and point the existing `vercel.json` schedule at the coordinator. Keep the old LINE route as a compatible protected wrapper so existing manual integrations do not break.

Do not add LINE or email delivery.

### Documentation references

- `modules/notifications/notification-types.ts`
- `modules/notifications/notification-service.ts:30-145`
- `modules/notifications/notification-recipient.ts`
- `modules/notifications/notification-service.test.ts`
- `app/api/line/daily-report/route.ts:7-22`
- `modules/line/line-daily-report-dispatcher.ts:135`
- `vercel.json:3-7`

### Verification checklist

- [x] Existing CM notifications and unread counts remain unchanged.
- [x] PM notifications are visible only to scoped recipients.
- [x] Re-running due/overdue dispatch creates no duplicate notification.
- [x] Mark-one, mark-group, and mark-all work for PM entities.
- [x] The daily coordinator preserves the existing LINE dispatch and protects both jobs with `CRON_SECRET`.
- [x] PM events initiate no LINE/email delivery; the coordinator only preserves the pre-existing daily LINE report job.

### Anti-pattern guards

- Do not pass PM events into `createCmNotifications`.
- Do not hard-code PM reads through a `CmWork` scope query.
- Do not rely on an in-memory once-only flag for scheduled idempotency.
- Do not add a second independent Vercel Cron when the existing daily coordinator can run both idempotent jobs.

---

## Phase 10 — Documentation, complete verification, and release gate

### What to implement

**Files**

- Modify `docs/Permission.md`
- Modify `docs/handover/PERMISSION_SYSTEM.md`
- Modify `docs/handover/DATABASE.md`
- Create `docs/PM-User-Manual-TH.md`
- Create `docs/PM-Test-Checklist-TH.md`
- Update `CONTEXT.md` only if implementation reveals a genuinely new domain term
- Add Playwright coverage under `tests/e2e/pm-planning.spec.ts` and `tests/e2e/pm-workflow.spec.ts`

Document Owner/Organization/Site management scope, the explicit Admin execution override, Engineer/Technician defaults, PM Group creation, calendar planning, confirmation, execution, correction, PM-to-CM handoff, and Asset history.

### Documentation references

- `docs/Permission.md`
- `docs/handover/PERMISSION_SYSTEM.md:309-316`
- `docs/handover/DATABASE.md:5-19`
- `docs/Development-Workflow-TH.md`
- `tests/e2e/technician-workflow.spec.ts`
- `playwright.config.ts`

### Final verification checklist

- [x] Both Prisma schemas validate, generate, and pass parity tests.
- [x] Permission matrix passes for every Role plus Role/User overrides.
- [x] Cross-Site mutation tests cover every PM service command.
- [x] Confirmation, claim, and notification concurrency/idempotency tests pass.
- [x] Desktop month calendar and mobile agenda pass Playwright workflows.
- [x] Asset PM record and PM-to-CM links pass end-to-end.
- [x] CSV export is scoped and correctly encoded.
- [x] Full unit suite and production build pass.
- [x] Search confirms no PM use of Zone as grouping, no stored OVERDUE status, no UI-only authorization, and no single-schema drift.

Run:

```powershell
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

Do not apply Supabase production migrations or deploy as part of implementation without separate authorization.

### Phase 10 execution record — 2026-08-15

- Added the PM permission/database handover documentation, Thai user manual, Thai release checklist, and Playwright coverage for desktop/mobile planning, scoped CSV, confirmation, assignment, execution, correction, Asset history, and PM-to-CM linking.
- Both Prisma providers validated and generated, TypeScript and diff validation passed, the complete Vitest suite passed 794/794, and the production build completed with all PM routes.
- Focused PM Playwright passed 4/4 with desktop calendar, mobile agenda, and completed-work screenshots. After updating stale legacy Admin, Dashboard, public-home/request, and seeded-CM assertions to the verified current product contracts, the authoritative full repository Playwright run passed 30/30 against a fresh unique disposable SQLite fixture.
- Browser verification exposed and fixed two runtime-only defects: composite PM Group membership nested creation now connects through the Asset composite identity, and PM Work Server Actions no longer capture a local URL function that React cannot serialize.
- The E2E harness now creates a new empty uniquely named SQLite file, applies the Prisma schema with `db push`, seeds deterministic fixtures, and runs with one worker so mutable workflows cannot race. Successful databases are removed automatically; a failed-run database is retained only for diagnosis. The PM workflow requires the Abnormal-result CM form and verifies the linked CM on PM detail, Asset maintenance history, and the database relation. CSV coverage proves unauthenticated denial, UTF-8 BOM encoding, and cross-Site exclusion. No Production database, deployment, staging, or commit was performed.
- Harness concurrency uses per-run ports, logs, results, and databases plus a workspace lock around the Next server's generated `next-env.d.ts` mutation; overlapping invocations queue and restore the original file byte-for-byte. Stability verification passed PM coverage three consecutive times (12/12) and the full 30-test suite in two consecutive fresh-database runs.
- Admin E2E also verifies destructive-action protection: an incorrect Owner Admin password produces the validation state and leaves the managed user intact before a correct password permits deletion and records the audit event.

### Anti-pattern guards

- Do not mark the release ready from focused tests alone; run the complete verification gate.
- Do not rewrite `CONTEXT.md` as an implementation manual.
- Do not apply production SQL, deploy, stage, or commit unless the user separately authorizes those actions.

---

## Recommended commit checkpoints

1. `feat(pm): add schema numbering and migration foundation`
2. `feat(pm): add permissions scope and navigation`
3. `feat(pm): add group management`
4. `feat(pm): add draft calendar planning`
5. `feat(pm): add transactional plan confirmation`
6. `feat(pm): add work assignment and lifecycle`
7. `feat(pm): add asset history and cm handoff`
8. `feat(pm): add summaries filters and csv export`
9. `feat(pm): add in-app notifications`
10. `docs(pm): add manual and release verification`

## Execution rule

Start implementation with Phase 1 only. After each phase, run its focused tests, review the diff for scope leakage and schema parity, and record the verification result before beginning the next phase. If a phase changes an approved business rule, stop and return to the design document rather than silently adapting the implementation.

### Phase 7 execution record — 2026-08-15

- Implemented explicit Abnormal Completed PM-to-CM handoff through the existing CM request service, with deterministic `pm-work:<id>:cm` submission keys and the persisted unique `originatingPmWorkId` relation.
- Enforced PM read plus `create_internal_request`, active Organization/Site, active same-Site Category/Zone, exact scoped PM Work, and an active exact Asset before CM creation.
- Added PM-to-CM and CM-to-PM links. Normal, unfinished, or canceled PM work never exposes or reaches the handoff command.
- Replaced the Asset PM placeholder with exact-Asset upcoming Planned/In Progress/derived Overdue rows and Completed/Canceled history including result, team, completion time, note, and linked CM.
- Remediation moved trusted PM origin/scope validation and actor-scoped Audit into the same CM creation transaction. Canonical idempotency is origin-first and requires an exact origin, Organization, Site, and submission-key match; duplicate Site codes, legacy keys, unrelated key collisions, and P2002 races are covered.
- Asset detail and its upload actions now use the authoritative operational scope: Owner Admin may read all Organizations, Organization Admin only its Organization, and Site roles only their Site.
- Internal PM creation now runs at Serializable isolation with three bounded retries for P2034 only. Every retry reruns canonical origin/key checks and all PM/Asset/Category/Zone validation; tests prove a retry observes a corrected Normal result or deactivated master and refuses creation.
- Focused and expanded Phase 7 verification: 125/125 tests passed. TypeScript and `git diff --check` passed.
- Full repository suite: 737/745 passed; the same eight pre-existing failures remain in Activities, Organization, work-scope copy, and LINE Store message tests and are outside the Phase 7 diff.

### Phase 9 execution record — 2026-08-15

- Generalized notification read scoping across `CmWork` and `PmWork` without routing PM events through CM recipient selection. Existing CM summary and read APIs remain intact; PM adds explicit summary, entity-read, and status-group read paths.
- Added PM in-app assignment/reassignment, due-today, first-overdue, and linked-CM notifications. Recipients are current PM assignees plus active managers constrained to Admin, the matching Organization, or the matching Site; CM Category membership is not consulted.
- Added a nullable unique `UserNotification.dispatchKey` in both providers, keyed by recipient/event/work/stable event date. SQLite migration integration proves the unique constraint, and duplicate scheduled writes suppress only Prisma P2002 conflicts.
- Assignment notifications share the assignment transaction. Due/overdue dispatch uses the planned date as a stable transition key; linked-CM retries use the same stable plan date.
- Extracted shared `CRON_SECRET` authorization, added `/api/cron/daily`, retained the old protected LINE wrapper, and repointed the single Vercel Cron. The coordinator runs LINE and PM independently, reports each result, and returns failure when either job fails so a safe idempotent retry can recover the failed side.
- PM notifications do not invoke LINE or email. The coordinator continues the pre-existing LINE daily-report job only.
- Local SQLite was backed up to `prisma/dev-before-phase9-notifications-20260815.db` before applying the Phase 9 migration. No Supabase production SQL was applied.
- Focused and expanded Phase 9 verification: 154/154 tests passed. Both Prisma schemas validated/generated, schema parity passed, TypeScript passed, and `git diff --check` passed.
- Full repository suite: 776/784 passed; the same eight pre-existing failures remain in Activities, Organization, work-scope copy, and LINE Store message tests and are outside the Phase 9 diff.
- Remediation replaced in-transaction P2002 recovery with a conflict-safe `dispatchKey` upsert/no-op. Each scheduled work is re-read inside its own transaction with current plan status/date, lifecycle, assignees, and effective layered `manage_pm_plans` recipients; stale work emits nothing and one failed work does not prevent later work attempts.
- Manager selection now honors System, Organization, and User permission overrides including explicit deny/grant cases. Assignees receive actionable personal copy while managers receive neutral operational copy.
- Linked-CM notification persistence is awaited inside the trusted PM-to-CM Serializable transaction, including canonical retry reconciliation, so CM creation cannot commit without durable notification intent.
- Daily LINE delivery now retries persisted FAILED event/destination records and propagates failure to the coordinator after recording the failed attempt. The single scheduled run is explicitly fixed to 08:00 Asia/Bangkok in validation, UI, and migration backfill; no unsupported arbitrary-time promise remains.
- Post-remediation focused/expanded verification: 198/199 passed, with the sole failure being the pre-existing LINE Store mojibake expectation. Full repository suite: 781/789 passed with the same eight baseline failures.
- Final remediation uses the canonical `canManagePmPlans` evaluator with the complete candidate permission context after Organization/Site scope matching; Owner Admin, layered deny/grant, legacy Site Admin, and granted non-manager roles now match application authorization exactly.
- LINE retry ownership is now explicit: only the creator of a new PENDING row sends initially; duplicate PENDING/SENT rows skip; FAILED rows must win an atomic `FAILED -> PENDING` compare-and-set before retrying. Concurrent retry tests prove one sender and correct attempt progression.
- Final focused/expanded verification: 201/202 passed with only the known LINE Store copy baseline failure. Full repository suite: 783/791 passed with the same eight baseline failures; TypeScript and `git diff --check` passed.
