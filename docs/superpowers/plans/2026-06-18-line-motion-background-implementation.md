# LINE Bot, Scroll Motion, and Gear Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Admin-configurable LINE group notifications, resilient delivery logs/retry, AOS-style reveal motion, and responsive gear backgrounds across the application.

**Architecture:** Store destination/category/event routing in PostgreSQL, isolate LINE HTTP calls behind a typed client, and dispatch only after the CM transaction succeeds so notification outages never break maintenance workflows. Implement visual polish with CSS and IntersectionObserver rather than a large animation dependency, respecting reduced motion and print output.

**Tech Stack:** Next.js 16, React 19, Prisma/PostgreSQL, LINE Messaging API, Vitest, native fetch, IntersectionObserver, Tailwind CSS

---

## File Map

- Modify Prisma schemas: `LineDestination`, `LineEventSetting`, `LineDeliveryLog`.
- Create `modules/line/line-types.ts`, `line-client.ts`, `line-routing.ts`, `line-delivery.ts` and tests.
- Create `app/admin/line/page.tsx`: destination/event settings, test and retry actions.
- Modify `modules/cm-work/cm-work-service.ts`: enqueue delivery after successful domain transaction.
- Create `components/reveal-on-scroll.tsx` and test.
- Modify `app/globals.css`: reveal classes, responsive gear background, print/reduced-motion rules.
- Modify `app/layout.tsx`: global visual background layer.
- Create `public/images/powercare-gears.webp`: optimized transparent gear pattern.
- Modify key pages to wrap sections with `RevealOnScroll`.

### Task 1: Add LINE Routing and Delivery Schema

**Files:**
- Modify: `prisma/schema.supabase.prisma`
- Modify: `prisma/schema.prisma`
- Create: `prisma/supabase-migrations/20260618_line_delivery.sql`

- [ ] **Step 1: Add models to both Prisma schemas**

```prisma
model LineDestination {
  id          String   @id @default(cuid())
  displayName String
  targetId    String   @unique
  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  settings    LineEventSetting[]
  deliveries  LineDeliveryLog[]

  @@index([categoryId, active])
}

model LineEventSetting {
  id            String @id @default(cuid())
  destinationId String
  destination   LineDestination @relation(fields: [destinationId], references: [id], onDelete: Cascade)
  eventType     String
  enabled       Boolean @default(true)

  @@unique([destinationId, eventType])
}

model LineDeliveryLog {
  id            String   @id @default(cuid())
  eventId       String
  destinationId String
  destination   LineDestination @relation(fields: [destinationId], references: [id])
  eventType     String
  payloadJson   String
  status        String   @default("PENDING")
  attempts      Int      @default(0)
  errorSummary  String?
  sentAt        DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([eventId, destinationId])
  @@index([status, createdAt])
}
```

Add `lineDestinations LineDestination[]` to `Category`.

- [ ] **Step 2: Apply only to Development Supabase and generate client**

Run: `npm run db:check:development`

Expected: safety check passes.

Run: `npx prisma db push --schema prisma/schema.supabase.prisma`

Expected: Development database synchronized.

Run: `npm run db:generate:supabase`

Expected: client generated.

- [ ] **Step 3: Review SQL and commit**

The SQL migration must create all three tables, foreign keys, unique constraints, and indexes shown above. Do not include channel access tokens in database rows or SQL.

```powershell
git add prisma/schema.prisma prisma/schema.supabase.prisma prisma/supabase-migrations/20260618_line_delivery.sql
git commit -m "feat: add LINE delivery routing schema"
```

### Task 2: Implement the LINE Messaging API Client

**Files:**
- Create: `modules/line/line-types.ts`
- Create: `modules/line/line-client.ts`
- Test: `modules/line/line-client.test.ts`

- [ ] **Step 1: Write failing client tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { createLineClient } from "./line-client";

describe("LINE client", () => {
  it("pushes a text message to the configured target", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const client = createLineClient({ accessToken: "token", fetcher });
    await client.pushText("group-id", "CM-2026-06-0001: New request");
    expect(fetcher).toHaveBeenCalledWith("https://api.line.me/v2/bot/message/push", expect.objectContaining({ method: "POST" }));
  });

  it("throws a sanitized error without the access token", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const client = createLineClient({ accessToken: "secret-token", fetcher });
    await expect(client.pushText("group-id", "message")).rejects.not.toThrow("secret-token");
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/line/line-client.test.ts`

Expected: FAIL because the LINE client is missing.

- [ ] **Step 3: Implement the client**

```ts
type LineClientOptions = {
  accessToken: string;
  fetcher?: typeof fetch;
};

export function createLineClient({ accessToken, fetcher = fetch }: LineClientOptions) {
  return {
    async pushText(targetId: string, text: string) {
      const response = await fetcher("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: targetId, messages: [{ type: "text", text }] }),
      });
      if (!response.ok) throw new Error(`LINE push failed with status ${response.status}`);
    },
  };
}
```

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- modules/line/line-client.test.ts`

Expected: all tests PASS.

```powershell
git add modules/line/line-types.ts modules/line/line-client.ts modules/line/line-client.test.ts
git commit -m "feat: add LINE Messaging API client"
```

### Task 3: Route Events by Category and Admin Settings

**Files:**
- Create: `modules/line/line-routing.ts`
- Test: `modules/line/line-routing.test.ts`

- [ ] **Step 1: Write failing routing tests**

```ts
it("routes electrical events to all-category and electrical destinations", () => {
  const result = selectLineDestinations({ eventType: "CLAIMED", categoryId: "electrical" }, [
    { id: "all", categoryId: null, active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
    { id: "electrical", categoryId: "electrical", active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
    { id: "mechanical", categoryId: "mechanical", active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
  ]);
  expect(result.map((item) => item.id)).toEqual(["all", "electrical"]);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/line/line-routing.test.ts`

Expected: FAIL because routing is missing.

- [ ] **Step 3: Implement event constants and routing**

Support NEW_REQUEST, CLAIMED, REASSIGNED, STATUS_CHANGED, RETURNED, WAITING_CLOSE, CLOSED, and CANCELED. Select only active destinations whose category is null or matches the work category and whose matching event setting is enabled.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- modules/line/line-routing.test.ts`

Expected: all tests PASS.

```powershell
git add modules/line/line-routing.ts modules/line/line-routing.test.ts modules/line/line-types.ts
git commit -m "feat: route LINE events by category and settings"
```

### Task 4: Add Resilient Delivery Logging and Retry

**Files:**
- Create: `modules/line/line-delivery.ts`
- Test: `modules/line/line-delivery.test.ts`
- Modify: `modules/cm-work/cm-work-service.ts`

- [ ] **Step 1: Write failing delivery tests**

Test that a successful send stores `SENT`, increments attempts, and sets `sentAt`; a failed send stores `FAILED` with a sanitized summary; duplicate event/destination uses the unique key and does not send twice; a failed LINE send does not reject the CM mutation result.

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/line/line-delivery.test.ts`

Expected: FAIL because delivery is missing.

- [ ] **Step 3: Implement delivery lifecycle**

Create pending rows with `eventId + destinationId`, call the client after the CM transaction succeeds, update SENT/FAILED, cap retries at three, and use exponential delays only for manual/background retry paths. Store payload without secrets.

- [ ] **Step 4: Integrate CM events**

After each successful domain transaction and in-app notification creation, call `dispatchLineEvent(event).catch(recordDispatchFailure)`. Do not await in a way that changes the CM response to failure; on Vercel use `after()` from `next/server` or a durable endpoint if runtime completion cannot be guaranteed. Verify the selected mechanism against the deployed Next.js version before coding.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- modules/line modules/cm-work`

Expected: all tests PASS.

```powershell
git add modules/line modules/cm-work/cm-work-service.ts
git commit -m "feat: deliver LINE events without blocking CM work"
```

### Task 5: Build Admin LINE Settings

**Files:**
- Create: `app/admin/line/page.tsx`
- Modify: `components/app-nav-links.tsx`
- Test: `modules/line/line-routing.test.ts`

- [ ] **Step 1: Add server permission tests**

Add `canManageLineSettings(role)` to `modules/auth/permission.ts`; expect true only for Admin.

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/auth/permission.test.ts`

Expected: FAIL because permission is missing.

- [ ] **Step 3: Build the Admin settings page**

Provide destination display name, LINE target ID, Category scope, active toggle, one checkbox per event type, Save, Send Test, delivery history, and Retry for failed rows below three attempts. Mask target IDs except the final four characters after save.

- [ ] **Step 4: Add audit and validation**

Audit create/update/deactivate/test/retry actions. Validate non-empty target ID and unique destination. Never render or store `LINE_CHANNEL_ACCESS_TOKEN`; read it only from server environment.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- modules/auth/permission.test.ts modules/line`

Expected: all tests PASS.

```powershell
git add app/admin/line components/app-nav-links.tsx modules/auth/permission.ts modules/auth/permission.test.ts modules/line
git commit -m "feat: add Admin LINE notification settings"
```

### Task 6: Add AOS-Style Reveal Motion

**Files:**
- Create: `components/reveal-on-scroll.tsx`
- Test: `components/reveal-on-scroll.test.tsx`
- Modify: `app/globals.css`
- Modify: key page components.

- [ ] **Step 1: Write failing reveal tests**

```tsx
it("reveals once when intersecting", () => {
  render(<RevealOnScroll><section>Dashboard panel</section></RevealOnScroll>);
  expect(screen.getByText("Dashboard panel").parentElement).toHaveAttribute("data-revealed", "false");
  intersectionCallback([{ isIntersecting: true }]);
  expect(screen.getByText("Dashboard panel").parentElement).toHaveAttribute("data-revealed", "true");
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- components/reveal-on-scroll.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the component**

Use one `IntersectionObserver` with threshold `0.12`, set revealed once, disconnect after reveal, and render immediately when `prefers-reduced-motion: reduce` is true or IntersectionObserver is unavailable.

- [ ] **Step 4: Add CSS and wrappers**

Add 16 px translateY, opacity 0 to 1, 300 ms ease-out, optional stagger CSS variable, and reduced-motion override. Wrap major sections on Public, Dashboard, Members, Reports, Profile, Work List, Tracking, and Admin pages; do not animate form controls independently.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- components/reveal-on-scroll.test.tsx app/chart-motion.test.ts`

Expected: all tests PASS.

```powershell
git add components/reveal-on-scroll.tsx components/reveal-on-scroll.test.tsx app/globals.css app
git commit -m "feat: add accessible scroll reveal motion"
```

### Task 7: Add Responsive Gear Backgrounds

**Files:**
- Create: `public/images/powercare-gears.webp`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `app/layout.test.tsx`

- [ ] **Step 1: Add a failing layout contract test**

Assert root markup contains `powercare-background` with `aria-hidden="true"`, and CSS includes mobile/desktop background-size rules, night mode opacity, print removal, and reduced-motion behavior.

- [ ] **Step 2: Run RED**

Run: `npm test -- app/layout.test.tsx`

Expected: FAIL because the background layer is missing.

- [ ] **Step 3: Add the optimized asset and layout layer**

Use a transparent WebP gear composition with enough empty space for content. Render one fixed non-interactive layer behind application content. Do not use `<img>` dimensions that stretch with viewport.

- [ ] **Step 4: Add responsive CSS**

Use `background-size: clamp(520px, 55vw, 980px) auto`, anchored right bottom on desktop; use `min(150vw, 620px) auto`, centered near top on mobile; lower opacity in Day and slightly raise it in Night while maintaining contrast. Add `@media print { .powercare-background { display:none } }`.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- app/layout.test.tsx`

Expected: all tests PASS.

```powershell
git add public/images/powercare-gears.webp app/layout.tsx app/globals.css app/layout.test.tsx
git commit -m "feat: add responsive gear background"
```

### Task 8: Phase 4 and Release Verification

- [ ] **Step 1: Run all automated checks**

Run: `npm test`

Expected: 0 failed tests.

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run build:vercel`

Expected: exit 0.

- [ ] **Step 2: End-to-end Development environment verification**

Verify every CM event type against enabled/disabled settings, all/electrical/mechanical destinations, duplicate prevention, failed delivery and retry, token secrecy, notification independence, scroll reveal once-only, reduced motion, Day/Night contrast, 320 px mobile background proportions, and print output without gears.

- [ ] **Step 3: Production readiness checkpoint**

Before any Production schema change: back up Supabase, perform a restore drill, review migration SQL, configure `LINE_CHANNEL_ACCESS_TOKEN` in Vercel server environment, create Storage bucket/policies, run Vercel Preview against Development Supabase, and obtain explicit user approval.

- [ ] **Step 4: Record the verification result**

If a check fails, add a regression test under the owning LINE or UI module, apply the minimal fix, rerun the complete Phase 4 verification, and commit only the files named by that task.
