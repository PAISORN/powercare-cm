# Current Progress

> Snapshot: 14 July 2026. This document describes the current local workspace, not merely the last pushed commit.

## Status Summary

PowerCare.CM has moved from a single-site CM application into a multi-organization, multi-site CM and spare-parts platform. Core workflows are functional locally, but the current implementation is not in a release-ready Git state because a large set of changes remains uncommitted and the latest production database migration status is unknown.

## Completed in the Current Workspace

### Platform and Tenancy

- Organization and Site foundation.
- Owner Admin, Organization Admin, Site Admin, Engineer, Technician, Store Officer, and Visitor roles.
- Organization- and Site-aware query scoping across Dashboard, All Work, Members, Notifications, Reports, master data, LINE, and Inventory.
- Organization structure map with role-aware visibility.
- Site Admin optional permission matrix and site quotas.
- Organization/Site selector patterns for Owner Admin administration.
- Site profile fields and branding.

### Corrective Maintenance

- Public site-specific request and tracking.
- QR generation for each site.
- CM numbering and complete status history.
- Claim, assign, reassign, start, progress update, return to queue, engineer return, waiting close, close, cancel, and Backlog Shutdown.
- Work-category restrictions with multiple categories per user.
- Engineer review of technician work details.
- Closed-work print document with signatures and branding.
- Dashboard KPIs, annual Status Overview, 12-month trend on desktop, responsive chart behavior, zone workload, priority queue, and date/category filters.
- Filterable work list, status cards, pagination, and compact detail layout.

### Communication and Reporting

- In-app notification read/unread behavior.
- Announcement scheduling, pinning, image, and NEW treatment.
- Public feedback collection.
- LINE webhook group discovery and signature verification.
- LINE destinations, event settings, routing, delivery logging, retry, test message, and daily report settings.
- Vercel Cron configured for 08:00 Bangkok.
- Consolidated CM reporting, Excel export, print/PDF, and date/category/site filters.
- Online/offline user status using `lastSeenAt`.

### User and File Management

- Admin user creation/edit/delete/reset password.
- Site/category assignment and multi-category checkboxes.
- Profile photo and signature upload.
- Supabase Storage/local storage abstraction and replacement uploads.
- Organization and Site logo upload.
- Audit records for administrative and operational changes.

### Store / Inventory

- Store categories, Stores, Spare Part Types, Spare Part Categories, Storage Zones, Spare Parts, Applicable Zones, and Stock.
- Automatic site spare-part code (`SP-{SITE}-{00001}`).
- Organization-level Item Code uniqueness.
- Minimum, maximum, reorder point, latest unit price, and active state.
- Stock receive, issue, adjustment, movement history, current value, and stock status.
- Direct, CM-linked, and public spare-part requests.
- Engineer approval and Store Officer issue/reject/not-enough-stock flow.
- Partial issue support and issue cancellation before approval.
- Requester tracking by issue number.
- Issue header numbering and per-item issue-line numbering.
- Inventory reports and My Activities integration.
- Responsive table work including sticky replacement headers and 50-row pagination.
- Seed data for a broad sample inventory set.

### Engineering Support

- Parallel SQLite and PostgreSQL Prisma schemas.
- Local Prisma migrations and Supabase SQL migrations through 14 July 2026.
- Supabase RLS and Storage policies intended for the Prisma server role.
- Development database guards, seed/import scripts, backup script, and local startup command.
- Vitest and Playwright test infrastructure.

## Currently Being Developed

The most recent active area is Store master-data and issue-line numbering:

- Codes for Store, Spare Part Type, Spare Part Category, and Storage Zone.
- Editable/active master data with dependency-aware deletion rules.
- Spare-part create/edit integration with the new masters.
- Issue-item line format:
  `SITE-STORE-TYPE-CATEGORY-ZONE-ITEM-RUNNING`.
- Five-digit per-item running sequence.
- Backfill of missing master codes in local and Supabase migration tracks.
- Recent Store/Spare Parts table and drawer UI refinements.

This work exists in the local working tree. Do not assume it is committed, migrated to production, or deployed.

## Still To Be Done

### Release and Data Safety

- Create an intentional feature branch from the full working copy.
- Back up local and production data.
- Review and split the very large change set into coherent commits.
- Confirm SQLite and PostgreSQL schema parity.
- Apply missing Supabase SQL migrations in order.
- Verify RLS policies, storage buckets, and environment variables.
- Deploy to Preview, run role-based smoke tests, then promote to Production.

### Security

- Replace the unsigned user-ID cookie with a signed/opaque server-side session.
- Add session expiry, renewal, revocation, and CSRF strategy.
- Add target-scope authorization to signature, profile-photo, and logo routes.
- Review every administrative Server Action for explicit permission and organization/site scope.
- Decide whether Prisma-role RLS is sufficient or whether stronger tenant-aware database policies are required.

### Maintainability

- Split large page files into action modules, query modules, and focused components.
- Centralize repeated organization/site selector logic.
- Reduce legacy `Plant`/`PLANT_ADMIN` naming without breaking existing data.
- Introduce stronger typed status/event constants at DB boundaries.
- Repair stale/mojibake legacy documents and strings.

### Product Roadmap

- Asset and Equipment registry.
- Preventive Maintenance scheduling and generated work orders.
- Meter Reading.
- Purchase Request, approval, Purchase Order, supplier, and goods receipt.
- Stock count/reconciliation and stronger warehouse operations.

## Current Priorities

1. Preserve and package the current working tree safely.
2. Verify schema/migration parity and release the current CM + Store foundation.
3. Harden authentication and cross-tenant media/data access.
4. Add multi-role end-to-end tests for CM and Store workflows.
5. Refactor oversized pages only after behavior is protected by tests.
6. Begin Asset/PM only after the Store release is stable.

## Blockers and Unknowns

- Live Supabase migration state is not recorded in the repository.
- Production storage bucket/policy state must be checked in Supabase.
- Current Vercel environment-variable completeness is not proven by local files.
- The working tree is too large for a safe one-shot commit without review.
- Full production-like E2E evidence for every role and tenant boundary is not yet documented.

## Pending Refactoring

| Area | Problem | Preferred Direction |
|---|---|---|
| `app/activities/page.tsx` | Large page containing many actions and UI branches | Extract activity queries/actions and reusable action drawer components |
| `app/work/[id]/page.tsx` | Workflow orchestration and presentation are tightly coupled | Move action handlers to domain-facing action module; split sections |
| Admin pages | Repeated scope selection and permission checks | Shared scoped-admin page helpers and selector components |
| Store pages | Similar filters, table layouts, drawers, and scope loading | Shared Store query/filter/table primitives |
| Permission system | Large role-to-permission sets | Keep central source but generate docs/tests and add permission bundles |
| Tenancy naming | UI Site vs code Plant | ADR and staged migration; never mass-rename blindly |
| Schema tracks | SQLite and PostgreSQL can drift | CI schema parity checks and migration inventory |
| Media routes | Authenticated but weak target checks | Central media authorization policy |

## Verification Snapshot

Fresh verification performed while preparing this handover package on 14 July 2026:

- `npx tsc --noEmit`: passed.
- Local SQLite Prisma schema validation: passed.
- Supabase PostgreSQL Prisma schema validation: passed using temporary syntactically valid PostgreSQL URLs; no live database connection or migration was attempted.
- Full Vitest run: **477 passed, 1 failed** across 147 test files.
- The single failure is `app/admin/site-admin-permissions/page.test.ts`. The implementation now renders the site selector through `AutoSubmitSelect`, while the source-inspection test still expects the old literal `select name="plantId"` markup. Treat this as stale test coupling and update the assertion after confirming the current selector behavior in the browser.
- No production build or live Supabase/Vercel deployment was run as part of documentation creation.

The working tree remains actively developed. Repeat the complete verification sequence before any release.

Recommended commands are documented in [AI_INSTRUCTIONS.md](./AI_INSTRUCTIONS.md).
