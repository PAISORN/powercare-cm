# LINE Webhook Group Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a signed LINE Messaging API webhook that records LINE groups and lets Admin explicitly convert a discovered group into an existing PowerCare.CM notification destination.

**Architecture:** Keep the public route thin. Pure helpers verify signatures and extract groups, an injectable discovery service handles idempotent persistence and optional group-name lookup, and the existing Admin LINE page pre-fills its existing destination form from an unlinked discovery.

**Tech Stack:** Next.js 16 App Router Route Handlers, TypeScript, Node `crypto`, Prisma 5, SQLite development migrations, Supabase PostgreSQL SQL migrations, Vitest

---

## File Map

- Create `modules/line/line-webhook.ts`: signature verification and safe event extraction.
- Create `modules/line/line-webhook.test.ts`: pure security and payload tests.
- Modify `modules/line/line-client.ts` and test: retrieve a LINE group summary without exposing credentials.
- Modify both Prisma schemas and add SQLite/Supabase migrations: persist discovered groups separately from active destinations.
- Create `modules/line/line-group-discovery-service.ts` and test: idempotent group discovery and optional name lookup.
- Create `modules/line/line-webhook-handler.ts` and test: HTTP status behavior with injected dependencies.
- Create `app/api/line/webhook/route.ts`: production route wiring.
- Modify `modules/line/line-settings-service.ts` and `app/admin/line/page.tsx`: list discoveries, pre-fill the existing form, and link a saved destination.
- Modify `.env.example` and `.env.production.example`: document `LINE_CHANNEL_SECRET` and LINE token settings.

### Task 1: Verify LINE Signatures And Extract Groups

**Files:**
- Create: `modules/line/line-webhook.ts`
- Create: `modules/line/line-webhook.test.ts`

- [ ] **Step 1: Write failing signature tests**

Test a known HMAC, a changed body, a malformed signature, and a missing secret:

```ts
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extractLineGroupEvents, verifyLineWebhookSignature } from "./line-webhook";

describe("LINE webhook security", () => {
  it("accepts only the signature for the exact raw body", () => {
    const body = JSON.stringify({ events: [] });
    const secret = "channel-secret";
    const signature = createHmac("sha256", secret).update(body).digest("base64");
    expect(verifyLineWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyLineWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(verifyLineWebhookSignature(body, "not-base64", secret)).toBe(false);
    expect(verifyLineWebhookSignature(body, signature, "")).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing group-extraction tests**

```ts
it("returns one latest discovery per valid group and ignores user sources", () => {
  expect(extractLineGroupEvents({ events: [
    { type: "join", timestamp: 1, source: { type: "group", groupId: "C-group-1" } },
    { type: "message", timestamp: 2, source: { type: "group", groupId: "C-group-1" } },
    { type: "message", timestamp: 3, source: { type: "user", userId: "U-user" } },
  ] })).toEqual([{ groupId: "C-group-1", eventType: "message" }]);
});
```

- [ ] **Step 3: Run RED**

Run: `npm.cmd test -- modules/line/line-webhook.test.ts --run`

Expected: FAIL because `line-webhook.ts` does not exist.

- [ ] **Step 4: Implement the pure helpers**

Use `createHmac`, `timingSafeEqual`, and exact raw-body bytes. Decode the supplied signature with Base64, return `false` on malformed input or different buffer lengths, and never throw for an invalid caller signature.

Define the minimal webhook types locally and return `{ groupId, eventType }[]`. Deduplicate by `groupId`, keeping the last valid event in payload order. Do not retain message text or user IDs.

- [ ] **Step 5: Run GREEN**

Run: `npm.cmd test -- modules/line/line-webhook.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add modules/line/line-webhook.ts modules/line/line-webhook.test.ts
git commit -m "feat: verify LINE webhook events"
```

### Task 2: Retrieve LINE Group Names Safely

**Files:**
- Modify: `modules/line/line-client.ts`
- Modify: `modules/line/line-client.test.ts`

- [ ] **Step 1: Write a failing client test**

```ts
it("retrieves a group summary with the configured access token", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ groupId: "C1", groupName: "CM Test" }));
  const client = createLineClient({ accessToken: "token", fetcher });
  await expect(client.getGroupSummary("C1")).resolves.toEqual({ groupId: "C1", groupName: "CM Test" });
  expect(fetcher).toHaveBeenCalledWith(
    "https://api.line.me/v2/bot/group/C1/summary",
    expect.objectContaining({ headers: { Authorization: "Bearer token" }, signal: expect.any(AbortSignal) }),
  );
});
```

Also test a missing Group ID and a non-200 response. Error messages may contain only the HTTP status, never the token or response body.

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- modules/line/line-client.test.ts --run`

Expected: FAIL because `getGroupSummary` does not exist.

- [ ] **Step 3: Implement `getGroupSummary`**

Add the method to the object returned by `createLineClient`. Encode `groupId`, send `Authorization: Bearer ...`, apply `AbortSignal.timeout(1500)`, validate `groupId` and `groupName` from JSON, and throw a sanitized status error on failure.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm.cmd test -- modules/line/line-client.test.ts --run`

```powershell
git add modules/line/line-client.ts modules/line/line-client.test.ts
git commit -m "feat: retrieve LINE group summaries"
```

### Task 3: Persist Discovered Groups

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.supabase.prisma`
- Create: `prisma/migrations/20260621160000_add_line_group_discovery/migration.sql`
- Create: `prisma/supabase-migrations/20260621_line_group_discovery.sql`

- [ ] **Step 1: Add the model to both schemas**

```prisma
model LineGroupDiscovery {
  id                 String           @id @default(cuid())
  groupId            String           @unique
  displayName        String?
  eventType          String?
  firstSeenAt        DateTime         @default(now())
  lastSeenAt         DateTime         @default(now())
  addedDestinationId String?          @unique
  addedDestination   LineDestination? @relation(fields: [addedDestinationId], references: [id], onDelete: SetNull)

  @@index([lastSeenAt])
}
```

Add `discovery LineGroupDiscovery?` to `LineDestination` in both schemas.

- [ ] **Step 2: Add the SQLite migration**

Create `LineGroupDiscovery` with `TEXT` IDs, `DATETIME` timestamps, the foreign key to `LineDestination` using `ON DELETE SET NULL`, unique indexes for `groupId` and `addedDestinationId`, and an index on `lastSeenAt`.

- [ ] **Step 3: Add the Supabase migration**

Create the same table with `TIMESTAMP(3)`, add indexes and foreign key, then enforce server-only access:

```sql
ALTER TABLE "LineGroupDiscovery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LineGroupDiscovery" FROM anon, authenticated;
```

- [ ] **Step 4: Generate and validate Prisma clients**

Run:

```powershell
npx.cmd prisma validate
npx.cmd prisma validate --schema prisma/schema.supabase.prisma
npx.cmd prisma generate
```

Expected: all commands exit 0.

- [ ] **Step 5: Apply only the local Development migration**

Run: `npx.cmd prisma migrate deploy`

Expected: `20260621160000_add_line_group_discovery` applied to local SQLite. Do not run any Supabase migration command in this task.

- [ ] **Step 6: Commit**

```powershell
git add prisma/schema.prisma prisma/schema.supabase.prisma prisma/migrations/20260621160000_add_line_group_discovery/migration.sql prisma/supabase-migrations/20260621_line_group_discovery.sql
git commit -m "feat: store discovered LINE groups"
```

### Task 4: Build The Idempotent Discovery Service

**Files:**
- Create: `modules/line/line-group-discovery-service.ts`
- Create: `modules/line/line-group-discovery-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Define repository and summary-client interfaces in the production module. Test that two events for the same group call an upsert, that a successful summary supplies `displayName`, and that a summary failure still stores the Group ID and resolves successfully.

```ts
const repository = { upsert: vi.fn(), list: vi.fn() };
const summaryClient = { getGroupSummary: vi.fn().mockRejectedValue(new Error("network")) };
const service = createLineGroupDiscoveryService({ repository, summaryClient });
await expect(service.discover([{ groupId: "C1", eventType: "join" }])).resolves.toBeUndefined();
expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({ groupId: "C1", displayName: null }));
```

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- modules/line/line-group-discovery-service.test.ts --run`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service and Prisma adapter**

`discover(events)` looks up group summaries independently, catches summary errors per group, and upserts:

```ts
update: { displayName: displayName ?? undefined, eventType, lastSeenAt: now }
create: { groupId, displayName, eventType, firstSeenAt: now, lastSeenAt: now }
```

Export `discoverLineGroups(events)` and `listLineGroupDiscoveries()` from the same module using `db.lineGroupDiscovery`, ordered by `lastSeenAt: "desc"`, and including `addedDestination`.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm.cmd test -- modules/line/line-group-discovery-service.test.ts --run`

```powershell
git add modules/line/line-group-discovery-service.ts modules/line/line-group-discovery-service.test.ts
git commit -m "feat: discover LINE groups idempotently"
```

### Task 5: Add The Secure Webhook Route

**Files:**
- Create: `modules/line/line-webhook-handler.ts`
- Create: `modules/line/line-webhook-handler.test.ts`
- Create: `app/api/line/webhook/route.ts`

- [ ] **Step 1: Write failing handler tests**

Build `createLineWebhookHandler({ channelSecret, discoverGroups })` and test:

- `503` when secret is empty.
- `401` for missing or invalid signature.
- `400` for signed invalid JSON.
- `200` for an empty event list.
- `200` and one discovery call for a signed group event.
- `500` when discovery persistence fails so LINE can retry.

Use `createHmac` in the tests to produce real signatures; do not mock signature verification.

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- modules/line/line-webhook-handler.test.ts --run`

Expected: FAIL because the handler does not exist.

- [ ] **Step 3: Implement the handler**

Read `request.text()` once, read the signature only from the `X-Line-Signature` header, verify before `JSON.parse`, call `extractLineGroupEvents`, and return JSON bodies containing only `{ ok: boolean }`. Do not echo request data or internal errors.

- [ ] **Step 4: Wire the Next.js route**

```ts
import { discoverLineGroups } from "../../../../modules/line/line-group-discovery-service";
import { createLineWebhookHandler } from "../../../../modules/line/line-webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return createLineWebhookHandler({
    channelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
    discoverGroups: discoverLineGroups,
  })(request);
}
```

- [ ] **Step 5: Run GREEN and commit**

Run: `npm.cmd test -- modules/line/line-webhook.test.ts modules/line/line-webhook-handler.test.ts --run`

```powershell
git add modules/line/line-webhook-handler.ts modules/line/line-webhook-handler.test.ts app/api/line/webhook/route.ts
git commit -m "feat: receive signed LINE webhooks"
```

### Task 6: Let Admin Add A Discovered Group

**Files:**
- Modify: `modules/line/line-settings.ts`
- Modify: `modules/line/line-settings-service.ts`
- Modify: `modules/line/line-settings.test.ts`
- Modify: `app/admin/line/page.tsx`
- Create: `app/admin/line/group-discovery-usage.test.ts`

- [ ] **Step 1: Write failing pure prefill tests**

Add `resolveLineDiscoveryPrefill(discovery)` to `line-settings.ts` and test:

```ts
expect(resolveLineDiscoveryPrefill({ id: "d1", groupId: "C123456789", displayName: "CM Test", addedDestinationId: null })).toEqual({
  discoveryId: "d1",
  displayName: "CM Test",
  targetId: "C123456789",
  active: false,
});
expect(resolveLineDiscoveryPrefill({ id: "d1", groupId: "C1", displayName: null, addedDestinationId: "dest" })).toBeNull();
```

- [ ] **Step 2: Write failing page contract tests**

Read `app/admin/line/page.tsx` and assert it uses `listLineGroupDiscoveries`, includes `discoveryId` in the form, links `Add group` to `?discovery=`, displays masked Group IDs, and does not expose a complete Group ID as visible text.

- [ ] **Step 3: Run RED**

Run: `npm.cmd test -- modules/line/line-settings.test.ts app/admin/line/group-discovery-usage.test.ts --run`

Expected: FAIL because discovery prefill and UI wiring do not exist.

- [ ] **Step 4: Link destination saves to discoveries**

Extend `saveLineDestination` input with `discoveryId?: string | null`. Inside the existing transaction, when `discoveryId` is present:

1. Find the discovery.
2. Reject when missing, already linked, or `groupId !== normalized.targetId`.
3. Create/update the destination using the existing audited flow.
4. Update `addedDestinationId` to the saved destination ID.

Never change the existing destination defaults for manually entered groups.

- [ ] **Step 5: Add discovered groups to the Admin page**

Load discoveries in the existing `Promise.all`. Add a section before active destinations. Show name/fallback label, masked ID, Bangkok first/last seen times, latest event type, and state. For an unlinked discovery render:

```tsx
<Link href={`/admin/line?discovery=${discovery.id}#add-line-group`}>Add group</Link>
```

When selected, pass the pure prefill result into `DestinationForm`, render hidden `discoveryId`, pre-fill the name and Target ID, and default `active` to false. Admin still chooses Category and events and clicks Save.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm.cmd test -- modules/line/line-settings.test.ts app/admin/line/group-discovery-usage.test.ts --run`

```powershell
git add modules/line/line-settings.ts modules/line/line-settings.test.ts modules/line/line-settings-service.ts app/admin/line/page.tsx app/admin/line/group-discovery-usage.test.ts
git commit -m "feat: add discovered LINE groups from admin"
```

### Task 7: Document Environment And Verify End To End

**Files:**
- Modify: `.env.example`
- Modify: `.env.production.example`

- [ ] **Step 1: Document server-only secrets**

Add:

```env
LINE_CHANNEL_ACCESS_TOKEN="replace-with-line-messaging-api-channel-access-token"
LINE_CHANNEL_SECRET="replace-with-line-messaging-api-channel-secret"
```

Include a comment that neither value may use `NEXT_PUBLIC_` and neither may be committed with a real value.

- [ ] **Step 2: Run focused verification**

```powershell
npm.cmd test -- modules/line/line-client.test.ts modules/line/line-webhook.test.ts modules/line/line-group-discovery-service.test.ts modules/line/line-webhook-handler.test.ts modules/line/line-settings.test.ts app/admin/line/group-discovery-usage.test.ts --run
```

Expected: all focused tests pass.

- [ ] **Step 3: Run full verification**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: all commands exit 0 with no test failures.

- [ ] **Step 4: Verify local webhook statuses**

With local Development database and a temporary test secret, send signed requests directly to `http://localhost:3000/api/line/webhook` and verify `200`; send a changed signature and verify `401`. Confirm the detected group appears on `/admin/line` but is not an active destination.

- [ ] **Step 5: Prepare HTTPS tunnel instructions without transmitting secrets**

Run locally after installing Cloudflare Tunnel:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Use the temporary URL shown by Cloudflare as:

```text
https://<temporary-name>.trycloudflare.com/api/line/webhook
```

The tunnel URL changes when the quick tunnel restarts. Do not configure Production or send a live LINE verification request without the user's action-time approval.

- [ ] **Step 6: Commit environment documentation**

```powershell
git add .env.example .env.production.example
git commit -m "docs: configure LINE webhook secrets"
```
