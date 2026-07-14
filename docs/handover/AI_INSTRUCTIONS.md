# Instructions for the Next AI Assistant

## 1. First Five Minutes

Before editing:

1. Read [MASTER_CONTEXT.md](./MASTER_CONTEXT.md), [CURRENT_PROGRESS.md](./CURRENT_PROGRESS.md), and the document relevant to the task.
2. Read root `CONTEXT.md` for domain terminology.
3. Run `git status --short` and inspect the relevant diff.
4. Identify whether the requested target is local, GitHub, Vercel Preview, or Production.
5. Read the relevant page, domain module, permission helper, scope helper, tests, and both Prisma schemas before forming a solution.

The workspace contains major uncommitted user work. Preserve it.

## 2. Non-Negotiable Project Rules

### Never discard user work

- Never use `git reset --hard`, `git clean`, or broad checkout/revert commands.
- Never overwrite a file without reading its current content and diff.
- Do not reformat unrelated files.
- Do not bundle unrelated refactors into a feature request.

### Never bypass tenancy

- Every business row must be read/written within Organization/Site scope.
- Owner Admin selection still requires server validation.
- Organization Admin cannot escape its Organization.
- Site users cannot escape their Site.
- Engineer/Technician CM actions must also respect Category eligibility.
- Public Site identity comes from the route/QR, not a hidden browser field.

### Never rely on UI hiding for security

- Every Server Action and Route Handler must enforce authentication, permission, scope, and state.
- Add negative tests for direct calls.

### Never change production casually

- Do not deploy, push, apply Supabase SQL, rotate secrets, delete data, or run production seed/import without explicit approval.
- Back up before production schema/data changes.
- State clearly whether a change is local only.

## 3. Architecture Constraints

- Keep the modular monolith unless an ADR justifies a different boundary.
- Use Server Components for reads and Server Actions for internal form mutations.
- Use Route Handlers for external integration, media, download, or a genuinely versioned API.
- Keep domain behavior in `modules/`; pages orchestrate and render.
- Use Prisma structured queries/transactions.
- Keep SQLite and Supabase PostgreSQL schemas aligned.
- Internal `Plant` means UI `Site`. Do not mass-rename.
- `PLANT_ADMIN` is a legacy compatibility value; create new Site Admin data as `SITE_ADMIN`.
- `ADMIN` is Owner Admin and should remain unique/limited.

## 4. Coding Standards

- TypeScript with explicit domain types.
- Reuse `RoleName`, `WorkStatus`, `PermissionKey`, Store status/type constants, and existing helpers.
- Avoid duplicate string literals for roles/status/event types.
- Validate external/FormData input with Zod or existing service validators.
- Prefer small pure functions for formatting and permission predicates.
- Use transactions for sequences, stock, status history, audit, and notification writes that form one operation.
- Use `Decimal` for quantities/prices; do not convert money through imprecise float arithmetic unnecessarily.
- Store UTC; display using Bangkok helpers.
- Add comments only for non-obvious business rules.
- Use `apply_patch` for manual edits; preserve file encoding as UTF-8.

## 5. Permission Implementation Pattern

For a new protected action:

```text
requireUser
  -> canUseUserPermission / domain permission predicate
  -> build operational/admin/store scope
  -> load target inside scope
  -> validate state and category/ownership
  -> mutate transactionally
  -> audit/history/notify
  -> revalidate/redirect
```

Do not accept a role string alone when a full user context is available; Site Admin optional grants require the full context.

## 6. Database Change Procedure

1. Edit `prisma/schema.prisma`.
2. Mirror the change in `prisma/schema.supabase.prisma` using provider-appropriate types/defaults.
3. Add a new local migration directory.
4. Add a new chronological Supabase SQL migration.
5. Add/adjust seed/backfill only when necessary.
6. Add schema/migration tests.
7. Validate both schemas.
8. Test with representative existing data, duplicate data, null legacy data, and cross-Site data.
9. Never edit an already applied production migration.

For a new table, decide:

- Organization/Site ownership.
- unique constraints and indexes.
- cascade/set-null behavior.
- active/deletion behavior.
- audit requirements.
- RLS enablement, grants, and policy.

## 7. Store-Specific Rules

- Generated spare-part code: `SP-{SITE_CODE}-{00001}`.
- Issue header number: `SI-{SITE_CODE}-{YYYY}-{MM}-{0001}`.
- Issue item line number: `SITE-STORE-TYPE-CATEGORY-ZONE-ITEM-00001`.
- Type-code formatting removes a leading `GL` when present.
- Per-item running number is five digits and not user-editable.
- Item Code is unique within an Organization.
- Storage Zone code is text; preserve leading zero.
- Do not delete master data referenced by parts/transactions; deactivate it.
- Receive/Issue/Adjust must update stock and movement in one transaction.
- Do not allow negative stock.
- Public Store issue requires Site feature permission/settings.

## 8. CM-Specific Rules

- Use the state machine; do not assign status directly without validating a transition.
- Closed and Canceled are terminal.
- Technician/Engineer claim is Site + Category constrained.
- Engineer review/return/close must load current work state and scope.
- Closed document printing requires authenticated non-Visitor access and Closed status.
- CM-linked Store requests must reference the same Site.
- Outstanding Store approval/issue conditions must not be bypassed before work submission where the workflow requires parts.

## 9. UI Implementation Style

- Match existing theme tokens and shell.
- Use Lucide icons.
- Main nav: bold with icon. Submenu: indented bullet, no icon.
- Use drawers for contextual editing/action flows.
- Use compact tables for operational lists.
- Preserve replacement sticky headers on Stock/Spare Parts.
- Auto-submit dropdown filters where the project already uses that convention.
- Verify both day/night and desktop/mobile.
- Do not introduce large decorative cards, nested cards, or one-hue visual monotony.
- Avoid fixed heights that create empty space or clip Thai text.
- Respect reduced motion.

## 10. Common Mistakes to Avoid

1. Querying by `id` alone after accepting an ID from FormData.
2. Letting Owner Admin selectors become an authorization bypass.
3. Applying Site filtering to Owner Admin incorrectly, or failing to apply it to Site roles.
4. Forgetting Organization filter for Organization Admin.
5. Checking only primary `categoryId` and ignoring `UserCategory`.
6. Updating one Prisma schema but not the other.
7. Adding a table without RLS/grants in Supabase migration.
8. Serving signatures/photos to any authenticated user without target scope.
9. Treating Server Actions as public stable APIs.
10. Using browser locale/date defaults that disagree with Bangkok server output and cause hydration warnings.
11. Reintroducing mojibake by saving Thai text with the wrong encoding.
12. Assuming a passing build means database migrations are live.
13. Assuming a pushed commit includes the current local implementation.
14. Mutating stock without a movement row or outside a transaction.
15. Deleting referenced Store master data instead of deactivating it.

## 11. Testing Expectations

### During implementation

- Run the closest focused Vitest files.
- Add positive and negative permission/scope tests.
- Add state-transition or transaction tests for domain changes.

### Before declaring code complete

```powershell
npx tsc --noEmit
npx prisma validate
npx prisma validate --schema prisma/schema.supabase.prisma
npm test
npm run build
```

Use the project's configured Node/npm runtime if direct commands are unavailable in the desktop environment.

### UI verification

- Start local app with `npm run dev:local` or `start-cm-web.cmd`.
- Test at least one allowed and one denied role.
- Inspect desktop and mobile screenshots.
- Test day and night.
- Verify empty/error/long-text states.
- For a complete workflow, use Playwright or the in-app browser and verify the database result.

### Database verification

- Validate duplicate constraints.
- Validate legacy null/backfill behavior.
- Validate cross-Organization/Site rejection.
- Validate transaction rollback on mid-operation failure.
- For stock/sequence work, test concurrent PostgreSQL behavior before production.

## 12. Git and Release Style

- Do not commit unless the user asks.
- Before staging, show/understand the intended scope.
- Prefer coherent commits such as schema, domain, UI, tests/docs.
- Never include `.env`, tokens, database dumps, local DB, logs, or uploaded private files.
- Deploy to Preview before Production.
- Production release requires migration status, backup, environment variables, storage policy, build, and smoke-test evidence.

## 13. Documentation Rules

- Update this handover package when changing architecture, schema, role capabilities, APIs, or release priorities.
- Update root `CONTEXT.md` when adding canonical domain terminology.
- Add an ADR for major architectural decisions such as tenant-aware RLS, session redesign, Site/Plant rename, external API, or service extraction.
- Mark obsolete docs as superseded; do not leave two competing sources of truth.

## 14. Preferred Working Style

1. Explore first and report what the code actually does.
2. State assumptions and release target.
3. Implement the smallest coherent change using existing patterns.
4. Add tests proportional to scope/risk.
5. Verify behavior end-to-end.
6. Summarize changed files, verification, and anything not performed.

If a user says “make it work,” continue through implementation and verification rather than stopping at a proposal. If production access or a destructive operation is required, stop and obtain explicit approval.

## 15. Handover Completion Checklist for a New AI

- [ ] Read all 10 files in `docs/handover/`.
- [ ] Read `CONTEXT.md` and relevant existing docs/specs.
- [ ] Inspect Git status and uncommitted diff.
- [ ] Identify current DB target with the provided scripts.
- [ ] Confirm the requested environment.
- [ ] Inspect permission + scope helpers.
- [ ] Preserve local changes.
- [ ] Run focused verification before editing broadly.
