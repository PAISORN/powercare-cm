# Announcements and In-App Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scheduled public announcements and per-user Facebook-style notifications with server-enforced permissions and audit history.

**Architecture:** Add Announcement and UserNotification models to both Prisma schemas, store announcement images through the existing Supabase Storage abstraction, and route all notification creation through one domain service. Render public announcements read-only, restrict announcement mutations to Admin, and expose unread/read operations only for the current user.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma/PostgreSQL, Supabase Storage, Vitest, Tailwind CSS

---

## File Map

- Modify `prisma/schema.supabase.prisma` and `prisma/schema.prisma`: announcement and notification models.
- Create `modules/announcements/announcement-service.ts` and tests.
- Create `modules/announcements/announcement-types.ts`: validated inputs.
- Modify `lib/file-storage.ts` and tests: announcement image storage.
- Create `app/admin/announcements/page.tsx`: Admin CRUD and history.
- Create `components/public-announcements.tsx`: pinned/new public list.
- Modify `app/page.tsx`: render active announcements.
- Create `modules/notifications/notification-service.ts` and tests.
- Create `modules/notifications/notification-recipient.ts` and tests.
- Create `components/notification-bell.tsx` and tests.
- Create `app/notifications/page.tsx`: full notification list.
- Create `app/notifications/read/route.ts` and `app/notifications/read-all/route.ts`.
- Modify `modules/cm-work/cm-work-service.ts`: emit notification events after successful work mutations.
- Modify `components/app-shell.tsx`: unread count and bell.

### Task 1: Add Announcement and Notification Schema

**Files:**
- Modify: `prisma/schema.supabase.prisma`
- Modify: `prisma/schema.prisma`
- Create: `prisma/supabase-migrations/20260618_announcements_notifications.sql`

- [ ] **Step 1: Add schema models to both Prisma schemas**

```prisma
model Announcement {
  id               String   @id @default(cuid())
  title            String
  content          String
  imageFileName    String?
  imageMimeType    String?
  imageFileSize    Int?
  imageStoragePath String?
  publishStart     DateTime
  publishEnd       DateTime
  pinned           Boolean  @default(false)
  active           Boolean  @default(true)
  authorId         String
  author           User     @relation("AnnouncementAuthor", fields: [authorId], references: [id])
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([active, publishStart, publishEnd])
  @@index([pinned, publishStart])
  @@index([authorId])
}

model UserNotification {
  id         String    @id @default(cuid())
  recipientId String
  recipient  User      @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  eventType  String
  entityType String
  entityId   String
  title      String
  message    String
  href       String?
  createdAt  DateTime  @default(now())
  readAt     DateTime?

  @@index([recipientId, readAt, createdAt])
  @@index([entityType, entityId])
  @@index([eventType])
}
```

Add `announcements Announcement[] @relation("AnnouncementAuthor")` and `notifications UserNotification[] @relation("NotificationRecipient")` to `User`.

- [ ] **Step 2: Generate and review development SQL**

Run only after `npm run db:check:development` passes:

`npx prisma db push --schema prisma/schema.supabase.prisma`

Expected: Development database synchronized without data loss warnings.

Create the reviewed PostgreSQL SQL file containing the two `CREATE TABLE` statements, foreign keys, and indexes above. Do not apply this SQL to Production in this phase.

- [ ] **Step 3: Generate Prisma Client and compile**

Run: `npm run db:generate:supabase`

Expected: Prisma Client generated.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 4: Commit**

```powershell
git add prisma/schema.prisma prisma/schema.supabase.prisma prisma/supabase-migrations/20260618_announcements_notifications.sql
git commit -m "feat: add announcement and notification schema"
```

### Task 2: Add Announcement Image Storage

**Files:**
- Modify: `lib/file-storage.ts`
- Modify: `lib/file-storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

```ts
it("stores one announcement image in its configured bucket", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "notice.webp", { type: "image/webp" });
  const saved = await saveAnnouncementImageFile("announcement-1", file);
  expect(saved.storagePath).toContain("announcement-1");
  expect(saved.mimeType).toBe("image/webp");
});

it("rejects announcement images larger than 2 MB", async () => {
  const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
  await expect(saveAnnouncementImageFile("announcement-1", file)).rejects.toThrow("2 MB or smaller");
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/file-storage.test.ts`

Expected: FAIL because `saveAnnouncementImageFile` is missing.

- [ ] **Step 3: Implement storage**

Add PNG/JPEG/WebP validation, 2 MB maximum, deterministic path `announcements/<announcementId>/cover.<ext>`, upsert replacement, and bucket env `SUPABASE_ANNOUNCEMENTS_BUCKET` defaulting to `powercare-announcements`.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- lib/file-storage.test.ts`

Expected: all storage tests PASS.

```powershell
git add lib/file-storage.ts lib/file-storage.test.ts
git commit -m "feat: store announcement cover images"
```

### Task 3: Implement Announcement Scheduling Rules

**Files:**
- Create: `modules/announcements/announcement-types.ts`
- Create: `modules/announcements/announcement-service.ts`
- Test: `modules/announcements/announcement-service.test.ts`

- [ ] **Step 1: Write failing visibility tests**

```ts
import { describe, expect, it } from "vitest";
import { isAnnouncementNew, isAnnouncementVisible } from "./announcement-service";

describe("announcement scheduling", () => {
  const now = new Date("2026-06-18T05:00:00Z");

  it("shows active announcements only inside the publish window", () => {
    expect(isAnnouncementVisible({ active: true, publishStart: new Date("2026-06-17T00:00:00Z"), publishEnd: new Date("2026-06-20T00:00:00Z") }, now)).toBe(true);
    expect(isAnnouncementVisible({ active: false, publishStart: new Date("2026-06-17T00:00:00Z"), publishEnd: new Date("2026-06-20T00:00:00Z") }, now)).toBe(false);
  });

  it("marks the first three publish days as new", () => {
    expect(isAnnouncementNew(new Date("2026-06-16T00:00:00Z"), now)).toBe(true);
    expect(isAnnouncementNew(new Date("2026-06-14T00:00:00Z"), now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/announcements/announcement-service.test.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement pure rules and Admin mutations**

Use Bangkok calendar-day difference for `NEW`, validate title/content, require `publishEnd >= publishStart`, and expose `listPublicAnnouncements(now)`, `createAnnouncement(actor, input)`, `updateAnnouncement(actor, id, input)`, `setAnnouncementActive(actor, id, active)`, and `deleteAnnouncement(actor, id)`. Every mutation requires Admin and calls `recordAudit`.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- modules/announcements/announcement-service.test.ts`

Expected: all tests PASS.

```powershell
git add modules/announcements
git commit -m "feat: add scheduled announcement service"
```

### Task 4: Build Admin Announcement CRUD and Public Display

**Files:**
- Create: `app/admin/announcements/page.tsx`
- Create: `components/public-announcements.tsx`
- Modify: `app/page.tsx`
- Modify: `components/app-nav-links.tsx`

- [ ] **Step 1: Write a failing rendering test**

Create `components/public-announcements.test.tsx` and assert pinned announcements render before unpinned announcements and a row with `isNew: true` renders a `NEW` badge.

- [ ] **Step 2: Run RED**

Run: `npm test -- components/public-announcements.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Build the Admin page**

Use server actions backed by the service. Provide title, content, optional image, publish start/end, pinned, active, edit, deactivate, and delete confirmation. Show expired/inactive rows in history instead of removing them from the list.

- [ ] **Step 4: Build and integrate the public component**

Render active announcements below the Public hero. Use one responsive image, `NEW` badge for three days, pinned icon, and Thai publish dates. No public action links.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- components/public-announcements.test.tsx modules/announcements/announcement-service.test.ts`

Expected: all tests PASS.

```powershell
git add app/admin/announcements components/public-announcements.tsx components/public-announcements.test.tsx app/page.tsx components/app-nav-links.tsx
git commit -m "feat: publish scheduled public announcements"
```

### Task 5: Implement Notification Recipient Rules and Service

**Files:**
- Create: `modules/notifications/notification-recipient.ts`
- Test: `modules/notifications/notification-recipient.test.ts`
- Create: `modules/notifications/notification-service.ts`
- Test: `modules/notifications/notification-service.test.ts`

- [ ] **Step 1: Write failing recipient tests**

```ts
it("targets admin and matching-category staff for a new request", () => {
  const recipients = selectRecipients({ eventType: "NEW_REQUEST", categoryId: "electrical", actorId: null }, [
    { id: "admin", role: "ADMIN", categoryId: null, active: true },
    { id: "elec", role: "TECHNICIAN", categoryId: "electrical", active: true },
    { id: "mech", role: "TECHNICIAN", categoryId: "mechanical", active: true },
  ]);
  expect(recipients.map((item) => item.id)).toEqual(["admin", "elec"]);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/notifications/notification-recipient.test.ts modules/notifications/notification-service.test.ts`

Expected: FAIL because notification modules are missing.

- [ ] **Step 3: Implement notification creation and reads**

Implement `createCmNotifications(event, tx?)`, `createAnnouncementNotifications(announcement, tx?)`, `getUnreadCount(userId)`, `listNotifications(userId, page)`, `markNotificationRead(userId, notificationId)`, and `markAllNotificationsRead(userId)`. All reads and updates include `recipientId: userId`; read operations are idempotent.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- modules/notifications`

Expected: all tests PASS.

```powershell
git add modules/notifications
git commit -m "feat: add per-user notification service"
```

### Task 6: Emit CM and Announcement Notifications

**Files:**
- Modify: `modules/cm-work/cm-work-service.ts`
- Modify: `modules/announcements/announcement-service.ts`
- Test: `modules/notifications/notification-service.test.ts`

- [ ] **Step 1: Add failing event-mapping tests**

Test mappings for NEW_REQUEST, CLAIMED, REASSIGNED, STATUS_CHANGED, RETURNED, WAITING_CLOSE, CLOSED, CANCELED, and ANNOUNCEMENT_PUBLISHED. Assert actor exclusion where appropriate and claimant inclusion for work-specific events.

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/notifications/notification-service.test.ts`

Expected: FAIL for missing event mappings.

- [ ] **Step 3: Move work update and notification inserts into one transaction**

For each CM mutation, use `db.$transaction(async tx => { update work; insert status history; insert notifications; return updated; })`. Keep audit after the transaction unless audit is also migrated to accept `tx`. Notification titles include the CM number and destination href generated as ``/work/${work.id}``.

- [ ] **Step 4: Emit announcement notifications only when active publish starts**

On immediate publication, create notifications in the create/update transaction. Future scheduled publication is handled by the public list in this phase; a scheduled background dispatcher is not added until there is a production scheduler requirement.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- modules/notifications modules/cm-work`

Expected: all tests PASS.

```powershell
git add modules/cm-work/cm-work-service.ts modules/announcements/announcement-service.ts modules/notifications
git commit -m "feat: emit notifications for CM activity"
```

### Task 7: Build the Notification Bell and Read Flows

**Files:**
- Create: `components/notification-bell.tsx`
- Test: `components/notification-bell.test.tsx`
- Create: `app/notifications/page.tsx`
- Create: `app/notifications/read/route.ts`
- Create: `app/notifications/read-all/route.ts`
- Modify: `components/app-shell.tsx`

- [ ] **Step 1: Write failing bell tests**

```tsx
it("caps the visible badge at 99+", () => {
  render(<NotificationBell unreadCount={120} notifications={[]} />);
  expect(screen.getByText("99+")).toBeInTheDocument();
});

it("does not mark items read merely by opening the menu", () => {
  render(<NotificationBell unreadCount={1} notifications={[notification]} />);
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(markRead).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- components/notification-bell.test.tsx`

Expected: FAIL because the bell is missing.

- [ ] **Step 3: Build bell, dropdown, and full page**

Show unread count, highlighted unread rows, first ten notifications, `View all`, and `Mark all as read`. Clicking a row POSTs its ID to the read route and then navigates to its authorized href. The full page paginates 50 rows.

- [ ] **Step 4: Enforce target permissions**

Before redirecting from the read route, load the entity and verify the current user can access it. If deleted or forbidden, mark the notification read and redirect to `/notifications?targetUnavailable=1`.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- components/notification-bell.test.tsx modules/notifications`

Expected: all tests PASS.

```powershell
git add components/notification-bell.tsx components/notification-bell.test.tsx app/notifications components/app-shell.tsx
git commit -m "feat: add unread notification center"
```

### Task 8: Phase 3 Verification

- [ ] **Step 1: Run tests and build**

Run: `npm test -- modules/announcements modules/notifications components/public-announcements.test.tsx components/notification-bell.test.tsx lib/file-storage.test.ts`

Expected: all focused tests PASS.

Run: `npm test`

Expected: 0 failed tests.

Run: `npm run build:vercel`

Expected: exit 0.

- [ ] **Step 2: Verify permissions and mobile UI**

On Development Supabase, test Admin announcement CRUD, public pin/new/expiry behavior, notification recipient selection for all roles/categories, per-user unread state, 99+ cap, read-one/read-all, deleted targets, and mobile dropdown/drawer placement.

- [ ] **Step 3: Record the verification result**

If a check fails, add a regression test in the owning module, apply the minimal fix, rerun all Phase 3 checks, and commit only the test and implementation files named by that task.
