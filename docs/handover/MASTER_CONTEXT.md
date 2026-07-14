# PowerCare.CM - Master Project Context

> Handover snapshot: 14 July 2026 (Asia/Bangkok)  
> Application version in `package.json`: `1.1.0`  
> Working copy status: active development with a large uncommitted change set. See [CURRENT_PROGRESS.md](./CURRENT_PROGRESS.md).

## 1. Project Purpose

PowerCare.CM is a multi-organization, multi-site maintenance management web application. Its current production focus is Corrective Maintenance (CM) for industrial plants and power plants, with an expanding Inventory/Spare Parts module.

The system serves four kinds of users:

1. Public requesters who submit and track maintenance requests without an account.
2. Maintenance staff who claim, execute, review, close, and print CM work.
3. Site and organization administrators who manage sites, users, permissions, master data, notifications, and reporting.
4. Store staff who manage spare-part masters, stock, receipts, issues, approvals, and stock movements.

The user interface is primarily Thai, while internal identifiers, code, and documentation use English.

## 2. Business Goals

- Replace paper and spreadsheet CM workflows with an auditable digital process.
- Give public requesters a low-friction QR/link-based request and tracking experience.
- Enforce site and work-category boundaries for maintenance staff.
- Give engineers an explicit review/return/close workflow.
- Produce printable closure documents with organization/site logos and stored signatures.
- Notify teams through in-app notifications and LINE Messaging API.
- Support many customer organizations, each with multiple sites and independent users, master data, settings, and public links.
- Add integrated spare-part control so CM work can request parts and follow engineer/store approvals.
- Preserve a path toward Asset, Preventive Maintenance, Meter Reading, and Purchase modules.

## 3. Source-of-Truth Warning

The local workspace is materially ahead of `origin/master`.

- Git HEAD at snapshot: `9f2fe5e` (`Animate work result status actions`).
- The working tree contains more than 100 modified tracked files and more than 160 untracked files.
- The multi-organization/site foundation, expanded permission system, Site profiles, Store module, recent UI work, and July database migrations are largely in this uncommitted working copy.
- Never run `git reset --hard`, `git clean`, mass checkout, or any command that discards the working tree.
- Before release, create a dedicated branch, back up the local database and Supabase, review the full diff, split changes into intentional commits, apply production SQL migrations, and perform role-based smoke tests.

Treat the current filesystem, not only Git history, as the implementation source of truth.

## 4. Current Implementation Status

### Implemented in the current local workspace

- Username/password authentication and cookie-based sessions.
- Owner Admin, Organization Admin, Site Admin, Engineer, Technician, Store Officer, and Visitor roles.
- Organization -> Site -> User hierarchy and scope-aware queries.
- Site Admin checkbox permissions and site quotas.
- Public CM request and tracking, including site-specific links and QR codes.
- CM list, filters, status cards, detail workflow, audit trail, backlog shutdown, return for correction, and closure printing.
- Dashboard, report filters, Excel export, report print view, and daily summary.
- User profiles, profile photos, signatures, organization logos, and site logos.
- Announcements, feedback, unread indicators, members, online/offline status, notifications, and audit/history views.
- LINE webhook group discovery, routing by site/category/event, delivery logs, retry, test message, and scheduled daily report.
- Inventory/Store module: master data, spare parts, stores, stock, receipts, issues, approval flow, public issue link, CM-linked issue, stock movement, reports, and activities.
- Local SQLite and Supabase PostgreSQL schemas plus migration scripts.
- Supabase Storage adapter with local storage fallback.
- Responsive sidebar/drawer, day/night themes, date-range picker, chart/table interactions, and scroll reveal effects.

### Present but incomplete or placeholder

- Assets, Equipment, Preventive Maintenance, and Meter Reading navigation exists as future-facing placeholders; no complete business module exists.
- Purchase Request and Purchase Order are roadmap items, not implemented end-to-end.
- Production deployment status of the latest July schema migrations is not established by the repository.
- Recent inventory numbering and master-code changes are implemented locally but require production migration and end-to-end release verification.

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI runtime | React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 plus global CSS variables and component classes |
| Icons | Lucide React |
| ORM | Prisma 5.22 |
| Local database | SQLite (`prisma/dev.db`) |
| Production database | Supabase PostgreSQL |
| File storage | Local filesystem in development; Supabase Storage in hosted environments |
| Authentication | Custom username/password auth with bcrypt and an HTTP-only cookie |
| Validation | Zod plus service-level validation |
| Dates | date-fns and date-fns-tz; Bangkok presentation timezone |
| Reports | SheetJS (`xlsx`), browser print/PDF |
| QR | `qrcode` |
| Testing | Vitest, Testing Library, Playwright |
| Hosting | Vercel |
| Scheduled jobs | Vercel Cron |
| Messaging | LINE Messaging API |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for data flow and deployment details.

## 6. Folder Structure

```text
app/                       Next.js routes, pages, Route Handlers, and page-local Server Actions
  admin/                   Owner/Organization/Site administration
  inventory/               Store and spare-part application pages
  p/[plantCode]/           Site-specific public routes
  reports/                 CM reports, export, and print
  work/                    CM list and detail workflow
components/                Shared shell, filters, charts, tables, drawers, and store UI
lib/                       DB client, session, file storage, date/time, cache, Excel, public URLs
modules/                   Domain services and permission/scope logic
  auth/                    Role and permission evaluation
  cm-work/                 CM state machine, workflow, numbering
  organization/            Organization/Site foundation and scope
  store/                   Inventory domain logic and numbering
  line/                    LINE routing, webhook, delivery, daily reports
prisma/
  schema.prisma            SQLite development schema
  schema.supabase.prisma   PostgreSQL production schema
  migrations/              Local Prisma migrations
  supabase-migrations/     SQL applied manually/operationally to Supabase
scripts/                   DB checks, seed/import, backup, E2E helpers
storage/                   Local development file storage; never use as hosted durable storage
tests/                     Cross-cutting and browser-oriented tests
docs/                      Product, deployment, workflow, and handover documentation
public/                    Static browser assets
```

## 7. Major Modules

### Corrective Maintenance

- Public request creation and tracking.
- Site-specific request URLs: `/p/[plantCode]/request` and `/p/[plantCode]/tracking`.
- CM numbering, status machine, assignment, progress updates, engineer review, close/cancel, closure document, and status/audit history.
- Work-category restrictions and multi-category Engineer/Technician support.
- Backlog Shutdown state for work deferred until plant shutdown.

### Organization and Site Management

- Owner Admin creates organizations and Organization Admin users.
- Organization Admin creates/manages sites under its own organization.
- Site Admin manages permitted users and selected site settings.
- UI says **Site**; the database and much of the code still use `Plant`, `plantId`, and `/p/[plantCode]` for compatibility.

### Permissions and Scope

- Baseline permissions are role-based.
- Site Admin can receive extra explicit permissions per site.
- Data access scope is enforced separately from UI visibility.
- Owner Admin is global; Organization Admin is organization-scoped; most other roles are site-scoped.

### Inventory / Spare Parts

- Site-scoped store, type, category, storage-zone, spare-part, stock, receipt, and issue management.
- Direct, CM-linked, and public issue requests.
- Engineer approval, Store Officer issue/not-enough-stock decisions, partial issue support, and requester tracking.
- Per-site spare-part and issue numbering; per-item issue-line running numbers.

### Communication

- In-app notifications with unread count and read state.
- Public announcements and public feedback.
- LINE group discovery through a verified webhook.
- Event routing by organization, site, category, destination, and event setting.
- Daily report scheduled at 08:00 Bangkok (`0 1 * * *` UTC).

### Reporting and Documents

- Filtered CM report, Excel export, print/PDF, daily summary, and closure document.
- Stored profile signatures are pulled automatically into closure documents.
- Organization/Site branding is selected from scoped profile data.

## 8. Current Architecture

PowerCare.CM is a **modular monolith**:

1. Browser requests a Next.js route.
2. A Server Component obtains the current user and builds an operational scope.
3. The page queries Prisma directly or calls a module query/service.
4. Mutations normally run as page-local Server Actions.
5. Domain services validate role, scope, category, state transition, and invariants.
6. Prisma writes business rows, histories, audit records, and notifications.
7. Selected events are delivered to LINE asynchronously within the request flow and recorded in delivery logs.

Only integration/file/download concerns use Route Handlers. The project is not a REST-first application.

## 9. Authentication Flow

1. `/login` submits username and password to a Server Action.
2. `modules/auth/auth-service.ts` loads an active user and verifies the bcrypt hash.
3. `setSession()` writes the user ID to the `cm_session_user` cookie.
4. `getCurrentUser()` reads the cookie, reloads the active user and related scope/permission data, and updates `lastSeenAt` at most once every two minutes.
5. `requireUser()` redirects unauthenticated requests to `/login`.
6. `/logout` clears the cookie.

Current security debt: the cookie contains an unsigned database ID, has no explicit lifetime, and does not use `SESSION_SECRET`. See [NEXT_TASKS.md](./NEXT_TASKS.md).

## 10. Authorization and Permission System

Authorization is layered:

1. **Role baseline** from `modules/auth/site-admin-permissions.ts`.
2. **Optional Site Admin grants** from `SiteAdminPermission`.
3. **Operational data scope** from `modules/organization/user-plant-scope.ts`.
4. **Domain checks** such as same site, same category, current CM status, current claimant, or approval state.
5. **Server-side checks** inside every Server Action/service; hiding a button is not considered authorization.

See [PERMISSION_SYSTEM.md](./PERMISSION_SYSTEM.md) for the full role description.

## 11. Organization -> Site -> User Hierarchy

```text
Owner Admin (global platform owner)
  Organization
    Organization Admin (organization scope)
    Site / Plant
      Site Admin
      Engineer
      Technician
      Store Officer
      Visitor
      Public Requester (no user account; site-specific link/QR)
```

Important rules:

- Owner Admin is not attached to one organization.
- Organization Admin must be attached to exactly its organization.
- Site Admin and operational users must be attached to a site in that organization.
- Public links resolve the site before accepting a request.
- Category and Zone master data are site-scoped.
- Internal code still uses `Plant`; do not perform a casual mass rename.

## 12. Database Overview

The schema currently contains 41 Prisma models grouped into:

- Identity and tenancy: `User`, `Organization`, `Plant`, `SiteAdminPermission`, `Signature`, `ProfilePhoto`.
- CM: `Category`, `UserCategory`, `Zone`, `CmWork`, `CmNumberSequence`, `StatusHistory`, `AuditEvent`, `SlaSetting`, `SystemSetting`.
- Communication: `Announcement`, `UserNotification`, five LINE models, profiles, and `PublicFeedback`.
- Store: 16 models for master data, sequences, stock, movements, receipts, and issues.

Local development uses SQLite. Production uses a parallel PostgreSQL schema. Both schemas must remain structurally aligned. See [DATABASE.md](./DATABASE.md).

## 13. API Overview

There are 10 HTTP Route Handlers for QR generation, media retrieval, LINE, notification read actions, and report export. Most application mutations are Server Actions located in page files. See [API.md](./API.md).

## 14. Coding Conventions

- Use TypeScript and existing module/service patterns.
- Prefer Server Components; add client components only for browser interaction.
- Keep permission and scope checks server-side.
- Use Prisma structured queries; do not build SQL or parse structured data with ad hoc strings.
- Store timestamps as UTC; format for `Asia/Bangkok` at the presentation boundary.
- Use `RoleName`, `WorkStatus`, `PermissionKey`, and Store constants instead of new string literals.
- Reuse `buildUserOperationalScope`, report/store scope helpers, and domain services.
- Add concise comments only for non-obvious rules.
- Add tests next to the module/page pattern already used.
- Keep SQLite and Supabase schemas/migrations in parity.
- Do not introduce a new architecture layer unless it removes real duplicated domain behavior.

## 15. UI Design Conventions

- Operational SaaS dashboard, not a marketing landing page after login.
- Theme tokens live in `app/globals.css`; day/night themes must both be verified.
- Use Lucide icons, compact controls, visible labels, and drawers for contextual editing.
- Desktop sidebar is collapsible; mobile uses a drawer.
- Main navigation labels are bold; submenus are indented, use a small bullet, and omit submenu icons.
- Forms and tables must remain usable at narrow widths; tables may scroll horizontally.
- Stock and Spare Parts use a replacement sticky table header.
- Date filtering uses the shared CM range picker and Bangkok/Thai Buddhist display formatting.
- Respect reduced-motion preferences.

See [UI_GUIDELINES.md](./UI_GUIDELINES.md).

## 16. Current Problems and Risks

1. **Release risk:** the active implementation is a very large uncommitted working tree.
2. **Schema drift risk:** SQLite, PostgreSQL, and live Supabase migration state can diverge.
3. **Session security:** unsigned user-ID cookie, no explicit expiry/rotation, and no session table.
4. **Media authorization:** signature, profile-photo, and logo endpoints authenticate inconsistently and do not always verify target scope.
5. **RLS model:** Supabase RLS policies grant the Prisma server role broad access; tenant isolation therefore depends heavily on application queries.
6. **Large pages:** `app/activities/page.tsx`, `app/work/[id]/page.tsx`, and administration pages mix presentation, actions, and orchestration.
7. **Terminology debt:** UI says Site while database/code says Plant; old `PLANT_ADMIN` remains a compatibility role.
8. **String states:** roles, permissions, workflow statuses, and event types are strings rather than database enums.
9. **Documentation debt:** older root documents contain stale assumptions and some mojibake; this handover package is the current snapshot.
10. **Test depth:** many tests are unit or source-structure tests; multi-role browser E2E coverage needs expansion.
11. **Production uncertainty:** latest migrations, seed/backfill, environment variables, and storage policies require explicit release verification.

## 17. Important Design Decisions

- **Modular monolith first:** simpler deployment and shared transactions while the domain is evolving.
- **Server Actions for internal workflows:** avoids a redundant public API layer for form-driven operations.
- **Application permissions plus scope:** role alone never decides data visibility.
- **Site-specific public URLs:** prevent requests and tracking from crossing sites.
- **Site-scoped operational master data:** supports hospitals, factories, and other organizations with different Categories/Zones.
- **Organization-level Item Code uniqueness:** `SparePart.itemCode` is unique within an organization, while generated spare-part code is site-specific.
- **Soft-disable master data:** records in use should be set inactive rather than deleted.
- **Per-item issue-line sequence:** reveals how many times an item has been requested while preserving a separate issue-header number.
- **Dual file-storage driver:** local development remains convenient; hosted deployments use durable Supabase Storage.
- **Compatibility naming:** retain `Plant` internally while presenting `Site` in UI until a dedicated migration is justified.

## 18. Future Roadmap

1. Stabilize and release the current Organization/Site/Store working tree.
2. Harden authentication, tenant isolation, media authorization, migration automation, and E2E coverage.
3. Complete inventory operational hardening: concurrency, idempotency, QR scanning, imports, cycle count, and reconciliation.
4. Add Asset Registry and Equipment hierarchy.
5. Add Preventive Maintenance plans, schedules, meter readings, and generated work orders.
6. Add Purchase Request, approval, Purchase Order, supplier, and goods receipt integration.
7. Add formal external API/webhook contracts for integrations.
8. Add observability, performance budgets, backup drills, and disaster-recovery evidence.

## 19. What the Next AI Must Know Before Editing

1. Read this package, `CONTEXT.md`, both Prisma schemas, permission files, and the relevant module before changing behavior.
2. Inspect `git status` first. Never discard unknown changes.
3. Confirm whether the task targets local development, GitHub, Preview, or Production.
4. Do not apply Supabase migrations or deploy unless explicitly authorized and a backup/rollback plan exists.
5. Preserve tenant boundaries in every query and mutation.
6. Preserve both Site and Category restrictions when changing CM assignment or Store behavior.
7. Treat `ADMIN` as Owner Admin in UI; do not create additional Owner Admin accounts casually.
8. Keep `PLANT_ADMIN` compatibility until existing data has been migrated and verified.
9. Update both Prisma schemas and both migration tracks for schema work.
10. Verify day/night and desktop/mobile for UI changes.
11. Run focused tests while editing, then TypeScript, Prisma validation for both schemas, full tests, build, and browser smoke tests before release.
12. Do not claim that local code is live until migration, commit, push, Vercel deployment, and production smoke checks have all succeeded.

## 20. Related Handover Documents

- [Current Progress](./CURRENT_PROGRESS.md)
- [Database](./DATABASE.md)
- [API](./API.md)
- [Architecture](./ARCHITECTURE.md)
- [Permission System](./PERMISSION_SYSTEM.md)
- [UI Guidelines](./UI_GUIDELINES.md)
- [Changelog](./CHANGELOG.md)
- [Next Tasks](./NEXT_TASKS.md)
- [AI Instructions](./AI_INSTRUCTIONS.md)
