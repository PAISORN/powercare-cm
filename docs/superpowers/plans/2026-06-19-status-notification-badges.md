# Status Notification Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build per-user CM notifications whose unread state powers the notification bell, Notifications page, Dashboard KPI badges, CM Work List status badges, and Work Results indicators.

**Architecture:** Store one `UserNotification` row per recipient and event, including `targetStatus` for grouping. Centralize recipient selection, event creation, unread queries, and read mutations in focused notification modules; CM services insert notifications in the same transaction as work changes. All badge links submit server-side read operations before redirecting to the authorized destination.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5, SQLite development database, Supabase PostgreSQL schema, Vitest, Testing Library, Playwright/Edge.

---

## File Map

- Modify `prisma/schema.prisma` and `prisma/schema.supabase.prisma`: `UserNotification` and User relation.
- Create local and reviewed Supabase migration artifacts.
- Create `modules/notifications/notification-types.ts`: event and status-group contracts.
- Create `modules/notifications/notification-recipient.ts` and tests: Role/Category recipient selection.
- Create `modules/notifications/notification-service.ts` and tests: creation, counts, lists, read-one/group/work/all.
- Modify `modules/cm-work/cm-work-service.ts`: emit notification rows in CM transactions.
- Create `components/notification-bell.tsx` and tests.
- Create `app/notifications/page.tsx`, `app/notifications/read/route.ts`, and `app/notifications/read-all/route.ts`.
- Modify `components/app-shell.tsx` and `components/app-nav-links.tsx`: bell and Notifications navigation.
- Create `components/unread-badge.tsx` and tests.
- Modify `components/status-kpi-strip.tsx`, `app/work/page.tsx`, and `app/dashboard/page.tsx`: grouped badges and read-before-filter actions.
- Modify Work Results links so unread work indicators clear only that work.

### Task 1: Add the Notification Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.supabase.prisma`
- Create: `prisma/supabase-migrations/20260619_user_notifications.sql`

- [ ] **Step 1: Add the relation to User in both Prisma schemas**

```prisma
notifications UserNotification[] @relation("NotificationRecipient")
```

- [ ] **Step 2: Add the model to both schemas**

```prisma
model UserNotification {
  id           String    @id @default(cuid())
  recipientId  String
  recipient    User      @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  eventType    String
  entityType   String
  entityId     String
  targetStatus String?
  title        String
  message      String
  href         String?
  createdAt    DateTime  @default(now())
  readAt       DateTime?

  @@index([recipientId, readAt, createdAt])
  @@index([recipientId, targetStatus, readAt])
  @@index([recipientId, entityType, entityId, readAt])
  @@index([entityType, entityId])
  @@index([eventType])
}
```

- [ ] **Step 3: Prepare PostgreSQL SQL without applying it**

Create SQL with the same columns, FK `ON DELETE CASCADE`, five indexes, RLS enabled, and:

```sql
REVOKE ALL ON TABLE "UserNotification" FROM anon, authenticated;
```

- [ ] **Step 4: Apply only to local SQLite and validate Supabase schema**

Run:

```powershell
npx prisma migrate status --schema prisma/schema.prisma
npx prisma migrate dev --name add_user_notifications
npx prisma generate --schema prisma/schema.prisma
$env:DATABASE_URL='postgresql://validator:validator@localhost:5432/validator'
$env:DIRECT_URL=$env:DATABASE_URL
npx prisma validate --schema prisma/schema.supabase.prisma
```

Expected: local datasource reports SQLite, migration and generation pass, Supabase schema validates without a database connection.

### Task 2: Define Recipient and Event Mapping

**Files:**
- Create: `modules/notifications/notification-types.ts`
- Create: `modules/notifications/notification-recipient.ts`
- Test: `modules/notifications/notification-recipient.test.ts`

- [ ] **Step 1: Write failing recipient tests**

```ts
it("targets admin and matching-category staff for a new request", () => {
  const recipients = selectRecipients(
    { eventType: "NEW_REQUEST", categoryId: "electrical", actorId: null, claimantId: null },
    [
      { id: "admin", role: "ADMIN", categoryId: null, active: true },
      { id: "elec-eng", role: "ENGINEER", categoryId: "electrical", active: true },
      { id: "elec-tech", role: "TECHNICIAN", categoryId: "electrical", active: true },
      { id: "mech", role: "TECHNICIAN", categoryId: "mechanical", active: true },
    ],
  );
  expect(recipients.map((item) => item.id)).toEqual(["admin", "elec-eng", "elec-tech"]);
});

it("includes claimant and matching engineers for status activity but excludes inactive users", () => {
  const recipients = selectRecipients(event, users);
  expect(recipients.map((item) => item.id)).toEqual(["admin", "engineer", "claimant"]);
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run modules/notifications/notification-recipient.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement exact event contracts**

```ts
export const NotificationEventType = {
  NEW_REQUEST: "NEW_REQUEST",
  CLAIMED: "CLAIMED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_CLOSE: "WAITING_CLOSE",
  RETURNED: "RETURNED",
  RELEASED: "RELEASED",
  CLOSED: "CLOSED",
  CANCELED: "CANCELED",
  ANNOUNCEMENT_PUBLISHED: "ANNOUNCEMENT_PUBLISHED",
} as const;
```

`selectRecipients` filters inactive users, always includes Admin, includes only matching-category Engineer/Technician users, explicitly includes the claimant when active, removes duplicates, and excludes the actor unless `eventType` is `ASSIGNED` and the actor is the assignee.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run modules/notifications/notification-recipient.test.ts`

Expected: all recipient tests PASS.

### Task 3: Implement Notification Creation, Counts, and Read Operations

**Files:**
- Create: `modules/notifications/notification-service.ts`
- Test: `modules/notifications/notification-service.test.ts`

- [ ] **Step 1: Write failing grouping and isolation tests**

```ts
it("groups unread counts for exact statuses and dashboard aggregates", () => {
  const result = groupUnreadByStatus([
    { targetStatus: "NEW", count: 2 },
    { targetStatus: "CLAIMED", count: 3 },
    { targetStatus: "WAITING_TO_CLOSE", count: 1 },
    { targetStatus: "CLOSED", count: 4 },
  ]);
  expect(result.total).toBe(10);
  expect(result.newRequest).toBe(2);
  expect(result.inProcess).toBe(4);
  expect(result.closed).toBe(4);
  expect(result.canceled).toBe(0);
});

it("scopes every read operation to the current recipient", async () => {
  const store = createNotificationStore();
  await markStatusGroupRead("user-a", "IN_PROCESS", store);
  expect(store.updatedRecipientIds).toEqual(["user-a"]);
});
```

- [ ] **Step 2: Run RED**

Run: `npx vitest run modules/notifications/notification-service.test.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement service functions**

```ts
createCmNotifications(event, tx)
getUnreadSummary(userId)
getUnreadWorkIds(userId, workIds)
getUnreadCount(userId)
listNotifications(userId, page)
markNotificationRead(userId, notificationId)
markStatusGroupRead(userId, group)
markWorkRead(userId, cmWorkId)
markAllNotificationsRead(userId)
```

Exact group mapping:

```ts
const IN_PROCESS_STATUSES = [
  "WAITING_TO_CLAIM",
  "CLAIMED",
  "IN_PROGRESS",
  "WAITING_TO_CLOSE",
  "RETURNED_FOR_CORRECTION",
];
```

Every Prisma `findMany`, `count`, and `updateMany` includes `recipientId: userId`. Read operations set `readAt` only where it is currently null and are therefore idempotent.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run modules/notifications/notification-service.test.ts modules/notifications/notification-recipient.test.ts`

Expected: all notification domain tests PASS.

### Task 4: Emit Notifications from CM Transactions

**Files:**
- Modify: `modules/cm-work/cm-work-service.ts`
- Test: `modules/notifications/notification-service.test.ts`
- Test: `modules/cm-work/cm-work-assignment.test.ts`

- [ ] **Step 1: Add failing event-mapping tests**

For each mutation assert the emitted event and target status:

```ts
expect(mapCmNotification("CREATE_REPAIR_REQUEST")).toMatchObject({ eventType: "NEW_REQUEST", targetStatus: "NEW" });
expect(mapCmNotification("START_WORK")).toMatchObject({ eventType: "IN_PROGRESS", targetStatus: "IN_PROGRESS" });
expect(mapCmNotification("CLOSE_WORK")).toMatchObject({ eventType: "CLOSED", targetStatus: "CLOSED" });
```

Cover create, claim, assign, start, release, waiting close, return, close, and cancel.

- [ ] **Step 2: Run RED**

Run: `npx vitest run modules/notifications modules/cm-work/cm-work-assignment.test.ts`

Expected: FAIL for missing mappings or notification writes.

- [ ] **Step 3: Add transaction-aware notification creation**

Each CM transaction loads active candidate users, updates work/status history, and calls:

```ts
await createCmNotifications(
  {
    eventType,
    cmWorkId: work.id,
    cmNumber: work.number,
    categoryId: work.categoryId,
    claimantId: updated.claimantId,
    actorId: actor?.id ?? null,
    targetStatus: updated.status,
    title: `${work.number} · ${statusLabels[updated.status]}`,
    message,
    href: `/work/${work.id}`,
  },
  tx,
);
```

Notification insertion occurs before the transaction returns. A notification failure rolls back the work mutation. Existing audit behavior remains intact unless migrated into the same transaction in that mutation.

- [ ] **Step 4: Run GREEN**

Run: `npx vitest run modules/notifications modules/cm-work`

Expected: all notification and CM tests PASS.

### Task 5: Build Bell, Notifications Page, and Secure Read Routes

**Files:**
- Create: `components/notification-bell.tsx`
- Test: `components/notification-bell.test.tsx`
- Create: `app/notifications/page.tsx`
- Create: `app/notifications/read/route.ts`
- Create: `app/notifications/read-all/route.ts`
- Modify: `components/app-shell.tsx`
- Modify: `components/app-nav-links.tsx`

- [ ] **Step 1: Write failing bell tests**

```tsx
it("caps the visible count at 99+ and hides zero", () => {
  const { rerender } = render(<NotificationBell unreadCount={120} notifications={[]} />);
  expect(screen.getByText("99+")).toBeTruthy();
  rerender(<NotificationBell unreadCount={0} notifications={[]} />);
  expect(screen.queryByText("99+")).toBeNull();
});

it("does not mark notifications read merely by opening the menu", () => {
  render(<NotificationBell unreadCount={1} notifications={[notification]} />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(screen.getByText(notification.title)).toBeTruthy();
});
```

- [ ] **Step 2: Run RED, implement, and run GREEN**

Run RED: `npx vitest run components/notification-bell.test.tsx`

The bell renders a stable circular icon button, red badge, ten most recent rows, `View all`, and `Mark all as read`. Opening the menu is read-only. Add `Notifications` to desktop/mobile navigation.

Run GREEN: `npx vitest run components/notification-bell.test.tsx`

- [ ] **Step 3: Implement secure routes and page**

`POST /notifications/read` accepts `notificationId`, loads it with `recipientId = currentUser.id`, marks it read, rechecks target permission, and redirects to its href. Missing/forbidden targets redirect to `/notifications?targetUnavailable=1`.

`POST /notifications/read-all` updates only the current recipient. `/notifications` paginates 50 rows and visually distinguishes unread rows.

### Task 6: Add Status and Work-Row Badges

**Files:**
- Create: `components/unread-badge.tsx`
- Test: `components/unread-badge.test.tsx`
- Modify: `components/status-kpi-strip.tsx`
- Modify: `app/work/page.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Write failing badge tests**

```tsx
it("renders no badge for zero and caps counts above 99", () => {
  const { rerender } = render(<UnreadBadge count={0} />);
  expect(screen.queryByLabelText(/unread/i)).toBeNull();
  rerender(<UnreadBadge count={125} />);
  expect(screen.getByText("99+")).toBeTruthy();
});
```

- [ ] **Step 2: Run RED and implement stable badge geometry**

Run: `npx vitest run components/unread-badge.test.tsx`

`UnreadBadge` uses an absolute red circle with `min-width`, fixed height, centered text, `pointer-events-none`, and an accessible label. Cards become `relative` without changing dimensions.

- [ ] **Step 3: Wire CM Work List**

Load `getUnreadSummary(currentUser.id)` and `getUnreadWorkIds(currentUser.id, currentPageWorkIds)`. Pass exact-status counts to `StatusKpiStrip`. Replace status links with POST forms/server actions that call `markStatusGroupRead`, then redirect to the existing filter URL. Work Result rows submit `markWorkRead` before redirecting to `/work/[id]` and show a dot when their ID is in the unread set.

- [ ] **Step 4: Wire Dashboard aggregates**

Pass summary counts as:

```ts
Total CM -> unread.total
New Request -> unread.newRequest
In Process -> unread.inProcess
Closed -> unread.closed
Cancel -> unread.canceled
```

Each KPI uses a server action to mark only its mapped group read before redirecting to Work List. `Total CM` calls the CM-only read operation, not global `markAllNotificationsRead`, so announcement notifications remain unread.

- [ ] **Step 5: Run GREEN**

Run: `npx vitest run components/unread-badge.test.tsx components/notification-bell.test.tsx modules/notifications`

Expected: all badge and notification tests PASS.

### Task 7: Full Verification and Production Safety

- [ ] **Step 1: Run automated verification**

```powershell
npm test
npx tsc --noEmit
npm run build
npx prisma migrate status --schema prisma/schema.prisma
git diff --check
```

Expected: zero failed tests, typecheck/build exit 0, datasource is local SQLite, five-plus local migrations are current, and diff check reports no errors.

- [ ] **Step 2: Browser verification**

Use local temporary users/work events and clean them afterward. Verify desktop `1440x1000` and mobile `390x844`, Day and Night:

1. Bell count equals unread CM plus announcement notifications.
2. Dashboard aggregate badges match exact mappings.
3. Work List exact-status badges match grouped data.
4. Clicking one status clears only that group and applies the correct filter.
5. Clicking a work row clears only that work.
6. Opening the bell does not mark anything read.
7. `Mark all as read` clears the bell.
8. Badge geometry does not shift cards or create overflow.

- [ ] **Step 3: Confirm cleanup and Production isolation**

Query local SQLite for temporary notification/work prefixes and require zero remaining rows. Confirm no Supabase SQL, Vercel deployment, push, or merge occurred.
