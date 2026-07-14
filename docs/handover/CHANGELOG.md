# Project Changelog

> This is a product-level implementation history reconstructed from code, migrations, Git history, and project documents. It is not a one-to-one commit log. Many 2026-06/07 items are present only in the current uncommitted working tree.

## Current Development Snapshot - 2026-07-14

### Store master codes and issue-line numbering

- Added editable codes for Stores, Spare Part Types, Spare Part Categories, and Storage Zones.
- Added active/inactive management and dependency-aware deletion rules.
- Integrated new masters into Spare Part create/edit forms.
- Added maximum stock and reorder-related fields.
- Added per-spare-part five-digit issue occurrence sequence.
- Added generated issue-item line format using Site, Store, Type, Category, Zone, Item Code, and running number.
- Added SQLite and Supabase structural/backfill migrations.
- Added/updated Store master, numbering, migration, and UI tests.

### Store UI refinement

- Redesigned Stock and Spare Parts operational tables.
- Added 50-row pagination, filter controls, drawers, edit/delete actions, and confirmation.
- Added replacement sticky table header and responsive horizontal behavior.
- Standardized Thai terminology from generic product/warehouse wording to spare-part wording.
- Refined Issue/Receive controls, quantity/unit, Max/Min, values, separators, and action alignment.

## Inventory and Store Foundation - 2026-07

- Added Store Officer role and permissions.
- Added Store category, Store, Spare Part category, Spare Part, applicable Zone, stock, movement, receipt, issue, and sequence models.
- Added Type and Storage Zone master models.
- Added site inventory code and site-specific public issue controls.
- Added direct, CM-linked, and public Store issue flows.
- Added multi-item issue requests.
- Added Engineer approval and Store Officer issue/not-enough-stock decisions.
- Added partial issue support and stock movement ledger.
- Added current stock/value/low/out-of-stock summaries.
- Added Store tracking, reports, My Activities integration, and LINE Store events.
- Added CM work guard around pending spare-part requests.
- Seeded a large sample spare-part set for UI testing.

## Multi-Organization and Multi-Site Expansion - 2026-06 to 2026-07

- Added Organization and Plant/Site schema foundation.
- Added Owner Admin, Organization Admin, Site Admin, and Visitor concepts.
- Renamed UI terminology from Plant Admin to Site Admin while retaining a legacy role alias.
- Added Organization -> Site -> User hierarchy and organization structure map.
- Added Organization/Site filters and scoped queries across major pages.
- Added user multi-category assignment.
- Added Site user/work-request quotas.
- Added Site Admin configurable permission matrix.
- Added site-specific profiles, logos, public request routes, public Store routes, and QR codes.
- Added owner/org/site role-aware organization structure visibility.
- Added Category and Zone Site scope.
- Added online/offline status via `lastSeenAt`.

## Corrective Maintenance Workflow Enhancements - 2026-06 to 2026-07

- Completed public request/tracking and internal CM workflows.
- Added work-number generation, status history, and audit trail.
- Added claim, assignment, Engineer assignment toggle, cancel, return, close, and print permissions.
- Added technician signature and Engineer review data in closure documents.
- Added multi-category claim restrictions.
- Added Return for Correction claim handling.
- Added progress-update prompts after elapsed time.
- Added Backlog Shutdown state and Engineer close behavior.
- Added compact work detail layout and Store request panel.
- Added work list filtering, status filter cards, pagination, notifications, and motion.

## Dashboard and Reporting - 2026-06 to 2026-07

- Redesigned authenticated and public dashboards.
- Added day/night theme and Bangkok-time default selection behavior.
- Added annual status overview, monthly trend, category/zone views, priority queue, and yesterday summary.
- Added interactive category/date filters and shared date range picker.
- Added unified CM report with new/closed summary, matching rows, Excel export, and print/PDF.
- Added report scope by Organization/Site and permission.
- Added Site/Organization logos in dashboard and documents.

## Communication - 2026-06

- Added public announcements with schedule, image, pinning, and NEW treatment.
- Added public feedback.
- Added in-app notifications, unread counts, and read/read-all flows.
- Added LINE Messaging API integration.
- Added verified webhook, group discovery, destination setup, event selection, category/site routing, delivery logs, retry, and test message.
- Added configurable daily LINE report and Vercel Cron at 08:00 Bangkok.

## Profiles, Users, and Audit - 2026-06

- Added user profile page and responsive redesign.
- Added profile-photo and signature upload/storage.
- Added Admin user CRUD, password reset, role, Organization/Site, Category, and file controls.
- Added protected delete confirmation flow and audit history.
- Added Organization profile and logo; later added Site profile and logo.
- Added Supabase Storage integration with replacement uploads.

## Production Foundation - 2026-06

- Moved production database direction to Supabase PostgreSQL.
- Added PostgreSQL Prisma schema and migration SQL.
- Added backup/restore and environment targeting scripts/documentation.
- Added Supabase RLS policies for Prisma server access.
- Added Vercel deployment configuration and performance/region work.
- Added GitHub repository/deployment workflow documentation.

## Initial CM Application - 2026-06

- Built Next.js CM application with login, roles, Dashboard, All Work, request, tracking, and closure document.
- Added Electrical/Mechanical categories and ten plant zones.
- Added Admin editing, Engineer/Technician workflows, claim restrictions, signatures, report printing, and responsive public UI.
- Added local SQLite schema, seed data, sample CM records, and Excel history import.

## Known Release Note Gap

The Git repository does not contain a clean commit boundary for most features after the last pushed commit. Before assigning a formal released version, create reviewed commits and verify migrations/deployment. Do not interpret this changelog as evidence that every item is live in Production.
