# Permission System

## 1. Model Overview

PowerCare.CM uses a layered authorization model:

1. **Role baseline:** a role receives a predefined set of `PermissionKey` values.
2. **Site Admin overrides:** selected permissions can be enabled per Site in `SiteAdminPermission`.
3. **Organization/Site scope:** determines which rows a user may see or mutate.
4. **Category scope:** determines which CM work Engineer/Technician users may claim or act on.
5. **Workflow state:** the CM or Store issue must be in a valid state.
6. **Ownership/assignment:** claimant, reviewer, requester, Engineer, or Store Officer constraints may apply.

Permission sources:

- `modules/auth/site-admin-permissions.ts`
- `modules/auth/permission.ts`
- `modules/users/user-admin-scope.ts`
- `modules/organization/user-plant-scope.ts`
- `modules/cm-work/cm-work-state-machine.ts`
- `modules/store/store-scope.ts` and Store services

UI visibility is convenience only. Server Actions and services must enforce the same rules.

## 2. Canonical Roles

| Internal value | UI name | Scope |
|---|---|---|
| `ADMIN` | Owner Admin | Entire platform |
| `ORGANIZATION_ADMIN` | Organization Admin | One Organization and its Sites |
| `SITE_ADMIN` | Site Admin | One Site, plus explicit optional grants |
| `ENGINEER` | Engineer | One Site and assigned Categories |
| `TECHNICIAN` | Technician | One Site and assigned Categories |
| `STORE_OFFICER` | Store Officer | One Site Store operations |
| `VISITOR` | Visitor | Read-only Site access |
| `PLANT_ADMIN` | Legacy Site Admin | Compatibility alias; do not create new data with this value |

`PUBLIC_REQUESTER` is a capability profile for unauthenticated flows, not a normal row-backed user role.

## 3. Owner Admin

### Scope

- Global across every Organization and Site.
- Must not be bound to one Organization or Site.
- Intended to be unique or extremely limited.

### Can do

- View global Dashboard, work, reports, members, status, notifications, and administration.
- Create/update Organizations.
- Create/update/deactivate Sites under any Organization.
- Create and manage Organization Admin, Site Admin, Engineer, Technician, Store Officer, and Visitor users.
- Set Site quotas and Site Admin permission checkboxes.
- Manage scoped Category, Zone, QR, SLA, system settings, LINE settings, branding, and Store configuration.
- Claim, assign, reassign, cancel, review, close, and print CM work across scopes.
- View platform-level administrative audit/history.
- Export reports across allowed selected scope.
- Grant the public Store issue feature and contact requirement at Site level.
- Access every PermissionKey in the current permission map.

### Must not do

- Create another Owner Admin through normal UI.
- Use a browser-selected Organization/Site without server validation.
- Be silently attached to the default Organization.

## 4. Organization Admin

### Scope

- Exactly one Organization.
- May view and manage that Organization's Sites.
- Must never see Organization Admin users or data belonging to another Organization.

### Can do

- View Organization-wide Dashboard, All Work, Members, Reports, notifications, and history.
- Select among Sites inside the Organization where cross-Site data is supported.
- Create and manage Sites under the Organization.
- Create/manage Site Admin, Engineer, Technician, Store Officer, and Visitor users within the Organization.
- Manage Organization/Site profiles, Categories, Zones, QR, LINE, SLA, priority/system settings allowed by its baseline.
- Create internal CM requests and track work.
- Claim, assign/reassign, cancel, review, close, print, and export CM work across the Organization.
- Configure Engineer assignment behavior.
- View Store dashboards, stock, and reports.

### Cannot do by baseline

- Create or manage Owner Admin.
- Create/manage another Organization Admin.
- Access another Organization.
- Manage global announcements/feedback reserved for Owner Admin.
- Manage Store master/receive/issue stock unless a future explicit permission is added; current baseline is primarily Store read/report access.

## 5. Site Admin

### Scope

- One Site.
- Cannot select or mutate another Site.
- Default permissions are intentionally narrower; Owner Admin may grant optional capabilities.

### Baseline capabilities

- Login, view Site Dashboard and All Work, profile, notifications, announcements, and members.
- Create internal CM request and track Site work.
- View/edit allowed CM priority, category, and zone fields.
- Claim, start, update progress/fix details/photos, submit for review, reopen, and view technician details.
- Assign across Categories where baseline allows Site administration.
- Print closed work and view Site reports/KPIs/history.
- Create Store issue requests and track related activity.

### Optional configurable capabilities

Owner Admin can enable selected permissions such as:

- assign/reassign/cancel/close CM work;
- report export;
- create/update/delete users, reset passwords, change roles/Sites/Categories;
- manage Site profile;
- manage Category, Zone, QR, LINE, Engineer assignment, SLA, and priority settings;
- test LINE and send daily report;
- view feedback or Site audit;
- manage Store, spare parts, receive/adjust stock, Store reports, or public Store settings.

The authoritative list is `SITE_ADMIN_CONFIGURABLE_PERMISSIONS`.

### Constraints

- Optional permissions do not expand organization/site data scope.
- User creation is also limited by Site quota.
- Site Admin cannot create Owner Admin or Organization Admin.

## 6. Engineer

### Scope

- One Site.
- One or more Categories through primary `categoryId` and `UserCategory` rows.

### Can do

- View Dashboard, Site work, profile, members, notifications, basic reports/history.
- Create and track CM requests.
- Claim work in an assigned Category.
- Start work, save progress/root cause/corrective action/notes, attach supported work evidence, request spare parts, and submit for closure.
- Assign work when the Site Engineer-assignment setting is enabled and Category matches.
- Cancel work in matching Category.
- Review technician details, return for correction, close work, and print closed documents.
- Move eligible work to Backlog Shutdown and close completed backlog work.
- Create Store issue requests, approve/reject issue requests as Engineer, and track Store issues.

### Cannot do

- Claim or act on another Site's work.
- Claim a Category that is not assigned.
- Manage users or Site master/settings by baseline.
- Perform Store Officer stock issue/receipt duties by baseline.

## 7. Technician

### Scope

- One Site and one or more assigned Categories.

### Can do

- View Site Dashboard/work/profile/members/notifications and basic reports.
- Create and track CM requests.
- Claim Category-matching work.
- Start work, update progress, record cause/action/note, request spare parts, and submit work for Engineer review.
- Return/reopen eligible assigned work according to the state machine.
- Print a closed completion document.
- Create and track Store issues.

### Cannot do

- Review/accept another technician's work.
- Close normal waiting-review work.
- Cancel by baseline.
- Claim another Category or Site.
- Manage users, settings, or stock.

## 8. Store Officer

### Scope

- One Site's Store/Inventory data.

### Can do

- View Store dashboard and stock.
- Manage Spare Part master data and Store-related masters.
- Receive stock and update latest unit price.
- Adjust stock with an auditable movement.
- View issue queue and issue/partially issue approved quantities.
- Reject or mark Not Enough Stock according to workflow.
- Create a Store issue where allowed.
- Track Store requests and view Store reports/movements.
- Use My Activities for pending Store actions.

### Cannot do

- Approve the Engineer approval stage unless separately acting under an Engineer role (the current user has one role).
- Access another Site's Store data.
- Perform CM close/review duties by baseline.
- Manage Organizations, Sites, or users.

## 9. Requester

There is currently no persisted authenticated `REQUESTER` role.

### Public Requester capabilities

- Open a Site-specific QR/link.
- Submit a CM request to that Site.
- Receive a CM number and track it without login.
- Submit a public Store issue when Owner Admin has enabled that Site feature.
- Provide contact information only when the Site setting requires it.
- Track a Store issue by its issue number.

### Public Requester restrictions

- Cannot browse work/stock/users.
- Cannot see another Site through a Site-specific route.
- Cannot claim, approve, issue, close, edit, or cancel after workflow rules no longer permit it.
- Does not receive My Activities because there is no authenticated account.

If an authenticated Requester role is added later, create a distinct role, permission baseline, scope tests, navigation rules, and migration. Do not overload `PUBLIC_REQUESTER` silently.

## 10. Visitor

### Scope

- One Site.

### Can do

- Login.
- View Site Dashboard, All Work list/detail, Members, announcements, and own profile.

### Cannot do

- Create, edit, claim, assign, start, review, close, cancel, print, export, administer, or mutate Store/CM data.

Visitor restrictions must be tested at the Server Action/service layer, not only by checking that buttons are hidden.

## 11. Guest / Public

Guest is not a stored role. It describes an unauthenticated browser.

- Can view the public dashboard and active announcements.
- Can submit public feedback.
- Can use Site-specific CM request/tracking.
- Can use public Store issue/tracking only when enabled.
- Cannot access authenticated pages, media, reports, or administration.

## 12. CM Workflow Permission Matrix

| Action | Owner | Org Admin | Site Admin | Engineer | Technician | Store Officer | Visitor/Public |
|---|---:|---:|---:|---:|---:|---:|---:|
| View scoped work | All | Organization | Site | Site | Site | Limited need | Visitor read / Public tracking only |
| Claim | Yes | Yes | Baseline | Assigned category | Assigned category | No | No |
| Assign | Yes | Yes | Optional/baseline context | If setting + category | No | No | No |
| Start/update assigned work | Yes | Yes | Yes | Yes | Yes | No | No |
| Request spare parts | Yes | Yes | Yes | Yes | Yes | May create direct | Public only if enabled |
| Cancel CM | Yes | Yes | Optional | Category match | No | No | No |
| Review/return | Yes | Yes | Optional/baseline context | Category match | No | No | No |
| Close | Yes | Yes | Optional | Category match | No | No | No |
| Print closed document | Yes | Yes | Yes | Yes | Yes | Authenticated non-Visitor if permitted by page | No |

Exact behavior also depends on state and assignment.

## 13. CM State Machine

```text
NEW -> CLAIMED | CANCELED
WAITING_TO_CLAIM -> CLAIMED | CANCELED
CLAIMED -> IN_PROGRESS | WAITING_TO_CLAIM | CANCELED
IN_PROGRESS -> WAITING_TO_CLOSE | BACKLOG_SHUTDOWN | WAITING_TO_CLAIM | CANCELED
BACKLOG_SHUTDOWN -> IN_PROGRESS | CLOSED | CANCELED
WAITING_TO_CLOSE -> CLOSED | RETURNED_FOR_CORRECTION | CANCELED
RETURNED_FOR_CORRECTION -> CLAIMED | WAITING_TO_CLOSE | CANCELED
CLOSED -> terminal
CANCELED -> terminal
```

## 14. Store Workflow Permissions

Typical flow:

1. Authenticated or allowed public requester creates issue.
2. Engineer approves/rejects requested quantities.
3. Store Officer issues, partially issues, rejects, or reports insufficient stock.
4. Stock and movement rows update atomically only at the issue step.
5. Requester sees status; authenticated requester also sees My Activities where applicable.

CM work with an outstanding required Store request must not bypass the intended approval/issue condition before submission for close.

## 15. Scope Rules

- Owner Admin: no automatic row filter, but selected scope must still be validated.
- Organization Admin: organization filter; may span Sites in that organization.
- Site Admin/Engineer/Technician/Store Officer/Visitor: `plantId` filter.
- Engineer/Technician action: Site plus Category eligibility.
- Public: Site resolved from route code, not user-provided organization ID.

## 16. Permission Change Checklist

When adding a permission:

1. Add a `PermissionKey` constant.
2. Decide role baselines.
3. Decide whether Site Admin may receive it optionally.
4. Add server-side checks.
5. Add navigation/UI visibility only after server checks.
6. Add role, Site, organization, and negative tests.
7. Update this document.
