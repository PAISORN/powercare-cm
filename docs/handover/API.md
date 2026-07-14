# HTTP API and Mutation Surface

> PowerCare.CM is not REST-first. The stable HTTP surface contains 10 Next.js Route Handlers. Most authenticated business mutations are Server Actions and are documented separately below.

## 1. Response Conventions

- Media/download endpoints return bytes with explicit `Content-Type`.
- LINE and Cron endpoints return JSON.
- Notification endpoints use HTTP 303 redirects after form submission.
- Authentication failures are normally `401`, permission failures `403`, missing scoped resources `404`.
- Server Actions usually redirect or re-render with query-string status/error flags rather than return public JSON contracts.

## 2. Route Handlers

### `GET /admin/qr-code/request.svg`

- **Purpose:** generate an SVG QR for a Site public CM request or public Store issue.
- **Query:** `organizationId`, `plantId`, optional `type=store`.
- **Request body:** none.
- **Response:** SVG bytes; `Cache-Control: no-store`; inline filename.
- **Authentication:** required session.
- **Permission:** `MANAGE_QR_CODE` through `canManageQrCode()`.
- **Scope:** Owner Admin may select an organization; other users are constrained to computed scope. A user bound to one Site cannot request another Site.
- **Errors:** `403`, `404`; Store QR also requires `inventoryCode` and public Store issue enabled.

### `GET /announcement-images/{id}`

- **Purpose:** serve an image for an active public announcement.
- **Request:** announcement ID path parameter.
- **Response:** image bytes with short public cache and stale-while-revalidate.
- **Authentication:** public.
- **Permission:** no user permission; database query requires active announcement inside publish window.
- **Errors:** `404` when not current or no image.

### `GET /api/line/daily-report`

- **Purpose:** dispatch all due LINE daily reports; Vercel Cron target.
- **Query:** optional `force=1` bypasses due-time selection for an authorized test/manual call.
- **Response:** JSON `{ ok: true, ...dispatchSummary }` or `{ ok: false, error }`.
- **Authentication:** `Authorization: Bearer <CRON_SECRET>` when secret exists. Development without the secret is allowed only outside production.
- **Permission:** Cron secret, not user role.
- **Schedule:** `0 1 * * *` UTC = 08:00 Asia/Bangkok.
- **Errors:** `401` unauthorized.

### `POST /api/line/webhook`

- **Purpose:** receive LINE Messaging API webhook events and discover invited groups.
- **Request:** LINE webhook JSON body plus `x-line-signature` header.
- **Response:** JSON from the webhook handler.
- **Authentication:** LINE HMAC signature using `LINE_CHANNEL_SECRET`.
- **Permission:** valid LINE signature; no application user session.
- **Behavior:** records/updates group discovery and intentionally does not act as a conversational chatbot.
- **Errors:** invalid/missing secret or signature and malformed payload are rejected by the handler.

### `POST /notifications/read`

- **Purpose:** mark one notification read and follow its safe work link.
- **Request:** form field `notificationId`.
- **Response:** HTTP 303 redirect to a scoped `/work/...` link or `/notifications`.
- **Authentication:** required; unauthenticated redirects to `/login`.
- **Permission:** notification must belong to current recipient and target must pass operational scope.
- **Errors:** unavailable target redirects with `targetUnavailable=1`.

### `POST /notifications/read-all`

- **Purpose:** mark all current user's scoped notifications read.
- **Request body:** none.
- **Response:** HTTP 303 redirect to `/notifications`.
- **Authentication:** required.
- **Permission:** only rows belonging to current user and operational scope.

### `GET /organization-logo`

- **Purpose:** serve Organization or Site logo bytes.
- **Query:** optional `organizationId`, optional `plantId` (Site takes precedence).
- **Response:** image bytes; Site logo public-cached briefly, Organization logo private-cached briefly.
- **Authentication:** required only when neither scope query is supplied.
- **Permission:** current implementation does not fully verify that an authenticated user can access the requested organization/site ID.
- **Errors:** `401`, `404`.
- **Security note:** add explicit public-use rules and target-scope authorization.

### `GET /profile-photo/{userId}`

- **Purpose:** serve a user's profile photo.
- **Response:** image bytes with private short cache.
- **Authentication:** required.
- **Permission:** current implementation authenticates but does not verify target user organization/site scope.
- **Errors:** `401`, `404`.

### `GET /reports/export`

- **Purpose:** export filtered CM rows as XLSX.
- **Query:** the report filter accepted by `parseReportFilter()` including dates and available status/category/zone/site/user filters.
- **Response:** XLSX attachment named `powercare-cm-report.xlsx`.
- **Authentication:** required.
- **Permission:** `EXPORT_REPORTS` through `canExportReports()`.
- **Scope:** `buildReportScope()` restricts results by role/organization/site.
- **Audit:** writes `EXPORT_REPORT` with format, row count, and filter summary.
- **Errors:** `401`, `403`.

### `GET /signatures/{userId}`

- **Purpose:** serve a stored user signature for authorized application views/documents.
- **Response:** signature bytes with `private, no-store`.
- **Authentication:** required.
- **Permission:** current implementation authenticates but does not verify target scope or a document-specific need.
- **Errors:** `401`, `404`.
- **Security note:** highest-priority media route to harden because signatures are sensitive.

## 3. Public Page Contracts

These are pages with Server Actions, not Route Handler APIs:

| Route | Purpose | Authentication | Main Mutation |
|---|---|---|---|
| `/` | Public dashboard, announcements, feedback | Public | Submit scoped feedback |
| `/request` | Legacy/default public CM request | Public | Create request in resolved default Site |
| `/tracking` | Legacy/default tracking | Public | Read by CM number |
| `/p/{plantCode}/request` | Site-specific CM request | Public | Create CM in that Site |
| `/p/{plantCode}/tracking` | Site-specific CM tracking | Public | Read only within that Site |
| `/p/{plantCode}/store/issue` | Site public spare-part request | Public | Create issue if Site setting/permission enabled |
| `/request/success/{number}` | Request confirmation | Public | None |
| `/store/tracking` | Spare-part issue tracking | Public | Read by issue number and Site context |

Public actions must never accept organization/site identity blindly from hidden form fields. Resolve Site from the route and re-check active/public settings on the server.

## 4. Authenticated Server Action Surface

### Authentication/Profile

- Login and logout.
- Upload/replace own profile photo.
- Upload/replace own signature.
- Change own password.

### CM Work

- Claim from list/detail.
- Assign or reassign to eligible staff.
- Start work.
- Save progress/root cause/corrective action/work note.
- Submit for review/closure.
- Return to queue.
- Move to/from Backlog Shutdown.
- Return for correction.
- Close or cancel.
- Create a CM-linked Store issue and cancel one's own pending issue.
- Mark work/status notification read.

Permissions combine role, Site, Category, current claimant, assignment setting, and CM state. See [PERMISSION_SYSTEM.md](./PERMISSION_SYSTEM.md).

### Administration

- Create/update Organizations and Sites.
- Create/update/delete/reset users.
- Assign role, Organization, Site, and multiple Categories.
- Update Site Admin permission flags and quotas.
- Create/activate/deactivate/delete Categories and Zones.
- Update SLA and system/engineer assignment settings.
- Update public Store issue settings.
- Create/update/publish announcements.
- Configure LINE destination events/daily report, test, retry, and send now.
- Upload/update Organization and Site branding/profile.

### Store

- Create/update Store categories, Stores, Spare Part Types, Spare Part Categories, and Storage Zones.
- Create/update/deactivate/delete Spare Parts subject to dependency rules.
- Receive stock.
- Adjust stock.
- Create direct or CM-linked issue.
- Engineer approve/reject.
- Store Officer issue, partially issue, reject/not enough stock.
- Delete/cancel eligible pending issue.
- Execute CM and Store actions from My Activities drawer.

## 5. Server Action Security Requirements

Every action must follow this order:

1. `requireUser()` unless intentionally public.
2. Permission check with current user context, not only role string.
3. Compute organization/site scope on the server.
4. Load the target within that scope.
5. Validate FormData and IDs.
6. Re-check domain state immediately before mutation.
7. Use a transaction for sequence, stock, status, history, and audit writes.
8. Revalidate affected pages/caches.

Never trust:

- `organizationId`, `plantId`, role, price, balance, status, claimant, or approval state from the browser;
- a hidden field merely because the UI generated it;
- a disabled button as authorization.

## 6. External API Roadmap

There is no versioned external REST API yet. Before exposing one:

- define `/api/v1` contracts and Zod schemas;
- use API clients/keys or OAuth, not browser sessions;
- include tenant scope in every credential;
- add idempotency keys for CM and stock writes;
- add pagination and stable error envelopes;
- use an outbox/webhook delivery log;
- document rate limits and audit behavior.
