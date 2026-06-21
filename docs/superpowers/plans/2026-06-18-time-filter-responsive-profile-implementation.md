# Time Filters, Responsive Navigation, and Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared Thailand-time filter foundation, responsive authenticated navigation, and mobile-first self-service profile without touching production data.

**Architecture:** Put all timezone and date-range semantics in pure helpers under `lib/date-time`, then expose one serializable filter contract to pages. Split the authenticated shell into shared link definitions plus a client-side mobile drawer, while server-side session and role checks remain in `AppShell`. Keep profile identity read-only and implement photo, signature, and password mutations as server actions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5, date-fns/date-fns-tz, Vitest, Testing Library, Tailwind CSS

---

## File Map

- Create `lib/date-time/bangkok-time.ts`: UTC/Bangkok boundaries and Thai display formatting.
- Create `lib/date-time/bangkok-time.test.ts`: midnight, leap-day, and Buddhist-year tests.
- Create `modules/filters/cm-date-filter.ts`: parse and serialize day/range/month/year/all filters.
- Create `modules/filters/cm-date-filter.test.ts`: validation and grouping tests.
- Create `components/cm-date-filter-bar.tsx`: shared filter controls.
- Create `components/app-nav-links.tsx`: one role-aware navigation definition.
- Create `components/mobile-app-drawer.tsx`: focus-safe responsive drawer.
- Create `components/mobile-app-drawer.test.tsx`: drawer behavior tests.
- Modify `components/app-shell.tsx`: consume shared navigation and render mobile controls.
- Modify `components/dashboard-filter-bar.tsx`: compose the shared date controls.
- Modify `app/dashboard/page.tsx`, `app/page.tsx`, and `app/work/page.tsx`: parse the shared filter contract.
- Modify `app/profile/page.tsx`: responsive layout and password action.
- Create `components/profile-password-form.tsx`: client validation and pending state.
- Create `components/profile-password-form.test.tsx`: password form behavior.
- Modify `app/globals.css`: responsive shell/profile styles only; global gear/motion remains Phase 4.

### Task 1: Isolate Development Data Before Mutating Tests

**Files:**
- Create: `scripts/check-development-database.ts`
- Modify: `package.json`
- Test: `scripts/check-development-database.test.ts`

- [ ] **Step 1: Write the failing database-target test**

```ts
import { describe, expect, it } from "vitest";
import { assertDevelopmentDatabase } from "./check-development-database";

describe("development database safety", () => {
  it("rejects the production Supabase project", () => {
    expect(() =>
      assertDevelopmentDatabase({
        databaseUrl: "postgresql://user:pass@db.prodref.supabase.co/postgres",
        productionProjectRef: "prodref",
      }),
    ).toThrow("Development database points to production Supabase");
  });

  it("accepts a distinct development Supabase project", () => {
    expect(() =>
      assertDevelopmentDatabase({
        databaseUrl: "postgresql://user:pass@db.devref.supabase.co/postgres",
        productionProjectRef: "prodref",
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- scripts/check-development-database.test.ts`

Expected: FAIL because `check-development-database.ts` does not exist.

- [ ] **Step 3: Implement the safety check**

```ts
export function assertDevelopmentDatabase(input: { databaseUrl?: string; productionProjectRef?: string }) {
  if (!input.databaseUrl) throw new Error("DATABASE_URL is required");
  if (!input.productionProjectRef) throw new Error("PRODUCTION_SUPABASE_PROJECT_REF is required");
  const host = new URL(input.databaseUrl).hostname;
  if (host.includes(input.productionProjectRef)) {
    throw new Error("Development database points to production Supabase");
  }
}

if (process.argv[1]?.endsWith("check-development-database.ts")) {
  assertDevelopmentDatabase({
    databaseUrl: process.env.DATABASE_URL,
    productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  });
  console.log("Development database safety check passed");
}
```

Add to `package.json`:

```json
"db:check:development": "tsx scripts/check-development-database.ts"
```

- [ ] **Step 4: Configure a separate Development Supabase project locally**

Set `.env.local` to the Development project and set `PRODUCTION_SUPABASE_PROJECT_REF` to the production project reference. Do not commit either value.

Run: `npm run db:check:development`

Expected: `Development database safety check passed`.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- scripts/check-development-database.test.ts`

Expected: 2 tests PASS.

```powershell
git add scripts/check-development-database.ts scripts/check-development-database.test.ts package.json
git commit -m "chore: guard development database usage"
```

### Task 2: Centralize Bangkok Time

**Files:**
- Create: `lib/date-time/bangkok-time.ts`
- Test: `lib/date-time/bangkok-time.test.ts`
- Modify: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write failing boundary and formatting tests**

```ts
import { describe, expect, it } from "vitest";
import { bangkokDayWindow, formatThaiDateTime } from "./bangkok-time";

describe("Bangkok time", () => {
  it("converts a Bangkok calendar day to an exclusive UTC window", () => {
    expect(bangkokDayWindow("2026-01-15")).toEqual({
      start: new Date("2026-01-14T17:00:00.000Z"),
      endExclusive: new Date("2026-01-15T17:00:00.000Z"),
    });
  });

  it("formats Buddhist year and 24-hour time", () => {
    expect(formatThaiDateTime(new Date("2026-06-18T07:30:00.000Z"))).toBe("18/06/2569 14:30 น.");
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- lib/date-time/bangkok-time.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the Bangkok helpers**

```ts
import { fromZonedTime } from "date-fns-tz";

export const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export function bangkokDayWindow(date: string) {
  const start = fromZonedTime(`${date}T00:00:00.000`, BANGKOK_TIME_ZONE);
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = next.toISOString().slice(0, 10);
  return { start, endExclusive: fromZonedTime(`${nextDate}T00:00:00.000`, BANGKOK_TIME_ZONE) };
}

export function formatThaiDateTime(value: Date) {
  const parts = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: BANGKOK_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")} น.`;
}
```

- [ ] **Step 4: Replace page-local timezone calculations**

Import `BANGKOK_TIME_ZONE` in `app/layout.tsx` and `components/theme-toggle.tsx`. Keep theme session behavior unchanged; only remove duplicated literal/time conversion logic.

- [ ] **Step 5: Verify GREEN and compile**

Run: `npm test -- lib/date-time/bangkok-time.test.ts app/layout.test.tsx`

Expected: all tests PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 6: Commit**

```powershell
git add lib/date-time app/layout.tsx components/theme-toggle.tsx
git commit -m "feat: centralize Bangkok date and time handling"
```

### Task 3: Define the Shared CM Date Filter Contract

**Files:**
- Create: `modules/filters/cm-date-filter.ts`
- Test: `modules/filters/cm-date-filter.test.ts`

- [ ] **Step 1: Write failing parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseCmDateFilter } from "./cm-date-filter";

describe("CM date filter", () => {
  it("parses a custom Bangkok range", () => {
    const result = parseCmDateFilter({ mode: "range", startDate: "2026-01-01", endDate: "2026-01-31" });
    expect(result.mode).toBe("range");
    expect(result.start.toISOString()).toBe("2025-12-31T17:00:00.000Z");
    expect(result.endExclusive.toISOString()).toBe("2026-01-31T17:00:00.000Z");
    expect(result.bucket).toBe("day");
  });

  it("rejects an end date before the start date", () => {
    expect(() => parseCmDateFilter({ mode: "range", startDate: "2026-02-01", endDate: "2026-01-31" })).toThrow("End date must not be before start date");
  });

  it("uses month buckets beyond 31 days", () => {
    expect(parseCmDateFilter({ mode: "range", startDate: "2026-01-01", endDate: "2026-06-30" }).bucket).toBe("month");
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/filters/cm-date-filter.test.ts`

Expected: FAIL because the parser is missing.

- [ ] **Step 3: Implement the discriminated filter type and parser**

```ts
import { bangkokDayWindow } from "../../lib/date-time/bangkok-time";

export type CmDateFilterInput = {
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
  includeTerminal?: string;
};

export type ParsedCmDateFilter = {
  mode: NonNullable<CmDateFilterInput["mode"]>;
  start?: Date;
  endExclusive?: Date;
  bucket: "day" | "month";
  includeTerminal: boolean;
};

export function parseCmDateFilter(input: CmDateFilterInput, now = new Date()): ParsedCmDateFilter {
  const mode = input.mode ?? "month";
  const includeTerminal = input.includeTerminal === "1";
  if (mode === "all") return { mode, bucket: "month", includeTerminal };
  const startDate = mode === "day" ? input.date : mode === "range" ? input.startDate : mode === "month" ? `${input.month}-01` : `${input.year}-01-01`;
  if (!startDate) throw new Error("Start date is required");
  const endDate = mode === "day" ? startDate : mode === "range" ? input.endDate : lastDateForPeriod(mode, startDate);
  if (!endDate) throw new Error("End date is required");
  if (endDate < startDate) throw new Error("End date must not be before start date");
  const start = bangkokDayWindow(startDate).start;
  const endExclusive = bangkokDayWindow(endDate).endExclusive;
  const dayCount = Math.ceil((endExclusive.getTime() - start.getTime()) / 86_400_000);
  return { mode, start, endExclusive, bucket: dayCount <= 31 ? "day" : "month", includeTerminal };
}
```

Implement `lastDateForPeriod()` in the same file using UTC calendar arithmetic for month/year and default missing month/year from Bangkok `now`.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- modules/filters/cm-date-filter.test.ts`

Expected: all parser tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add modules/filters lib/date-time
git commit -m "feat: add shared CM date filter contract"
```

### Task 4: Build the Shared Date Filter UI

**Files:**
- Create: `components/cm-date-filter-bar.tsx`
- Test: `components/cm-date-filter-bar.test.tsx`
- Modify: `components/dashboard-filter-bar.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmDateFilterBar } from "./cm-date-filter-bar";

describe("CmDateFilterBar", () => {
  it("shows both date inputs for range mode", () => {
    render(<CmDateFilterBar defaultMode="range" />);
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();
    expect(screen.getByLabelText("End date")).toBeInTheDocument();
  });

  it("switches to year input", () => {
    render(<CmDateFilterBar defaultMode="day" />);
    fireEvent.change(screen.getByLabelText("Date view"), { target: { value: "year" } });
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- components/cm-date-filter-bar.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement the client component**

Create a controlled `<select aria-label="Date view">` with Day, Range, Month, Year, All options; render native `date`, `month`, or numeric year controls based on mode; include the `includeTerminal` checkbox; preserve Category in hidden/query values. Use standard form submit so public and authenticated Server Components share behavior without client fetching.

- [ ] **Step 4: Compose it into `DashboardFilterBar`**

Replace `DashboardTimeRangeFilter` controls with `CmDateFilterBar` while retaining Work Category, Apply, and Clear. Serialize `mode`, `date`, `startDate`, `endDate`, `month`, `year`, and `includeTerminal` in the URL.

- [ ] **Step 5: Run GREEN**

Run: `npm test -- components/cm-date-filter-bar.test.tsx modules/filters/cm-date-filter.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add components/cm-date-filter-bar.tsx components/cm-date-filter-bar.test.tsx components/dashboard-filter-bar.tsx
git commit -m "feat: add reusable date range controls"
```

### Task 5: Make the Authenticated Navigation Responsive

**Files:**
- Create: `components/app-nav-links.tsx`
- Create: `components/mobile-app-drawer.tsx`
- Test: `components/mobile-app-drawer.test.tsx`
- Modify: `components/app-shell.tsx`

- [ ] **Step 1: Write failing drawer behavior tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileAppDrawer } from "./mobile-app-drawer";

describe("MobileAppDrawer", () => {
  it("opens from the menu button and closes from the overlay", () => {
    render(<MobileAppDrawer userName="Electrical Technician" role="TECHNICIAN" categoryName="งานไฟฟ้า" unreadCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "Application menu" })).toBeVisible();
    fireEvent.click(screen.getByTestId("drawer-overlay"));
    expect(screen.queryByRole("dialog", { name: "Application menu" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- components/mobile-app-drawer.test.tsx`

Expected: FAIL because the drawer is missing.

- [ ] **Step 3: Extract shared links**

Export a `getAppLinks(role)` function containing Dashboard, All Work, Members, Reports, Profile, Create Request, Track Work, Admin, History, and Logout. Members is visible to every role; Admin/History only to Admin.

- [ ] **Step 4: Implement the drawer**

Use a client component with `open` state, a 44 px Menu button beside Home, `role="dialog"`, overlay close, Escape close, body scroll lock, and focus return. Use Lucide icons and the shared link list.

- [ ] **Step 5: Integrate into `AppShell`**

Keep session lookup server-side. Render desktop navigation from the same links and mobile drawer below `md`. Remove the standalone mobile Logout button because Logout lives in the drawer.

- [ ] **Step 6: Run GREEN and accessibility checks**

Run: `npm test -- components/mobile-app-drawer.test.tsx app/layout.test.tsx`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add components/app-nav-links.tsx components/mobile-app-drawer.tsx components/mobile-app-drawer.test.tsx components/app-shell.tsx
git commit -m "feat: add responsive authenticated navigation"
```

### Task 6: Rebuild Profile for Mobile and Add Password Change

**Files:**
- Create: `components/profile-password-form.tsx`
- Test: `components/profile-password-form.test.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `lib/password.ts`

- [ ] **Step 1: Write failing password form tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfilePasswordForm } from "./profile-password-form";

describe("ProfilePasswordForm", () => {
  it("rejects mismatched confirmation before submit", () => {
    render(<ProfilePasswordForm action={async () => undefined} />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "StrongPass123" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- components/profile-password-form.test.tsx`

Expected: FAIL because the component is missing.

- [ ] **Step 3: Add the server action**

In `app/profile/page.tsx`, add `changeOwnPassword(formData)` that requires the current user, verifies current password with `verifyPassword`, validates a minimum 10-character new password and confirmation, hashes with `hashPassword`, updates only that user's `passwordHash`, records an audit event, and redirects with a success/error query value.

- [ ] **Step 4: Implement the responsive profile layout**

Use one-column mobile layout, two-column upload cards from `lg`, and remove decorative nested navigation that has no routes. Keep identity fields read-only. Preserve photo/signature replacement behavior and fix existing mojibake Thai labels while editing the page.

- [ ] **Step 5: Run GREEN and compile**

Run: `npm test -- components/profile-password-form.test.tsx lib/file-storage.test.ts`

Expected: all tests PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 6: Commit**

```powershell
git add app/profile/page.tsx components/profile-password-form.tsx components/profile-password-form.test.tsx lib/password.ts
git commit -m "feat: improve responsive profile self service"
```

### Task 7: Phase 1 Verification

**Files:**
- Modify only if verification exposes defects.

- [ ] **Step 1: Run the focused tests**

Run: `npm test -- lib/date-time modules/filters components/cm-date-filter-bar.test.tsx components/mobile-app-drawer.test.tsx components/profile-password-form.test.tsx app/layout.test.tsx`

Expected: all tests PASS.

- [ ] **Step 2: Run the full suite and build**

Run: `npm test`

Expected: 0 failed tests.

Run: `npm run build:vercel`

Expected: production build exits 0.

- [ ] **Step 3: Browser verification**

Run the dev server only after `npm run db:check:development` succeeds. Verify `/dashboard`, `/work`, and `/profile` at 320x568, 390x844, 768x1024, and 1440x900. Confirm no horizontal overflow, drawer focus behavior, upload preview, password errors, Day/Night persistence, and Thai date boundaries.

- [ ] **Step 4: Record the verification result**

If a check fails, return to the task that owns the affected file, add a failing regression test, apply the minimal fix, rerun the full Phase 1 verification, and commit the test plus fix under that task's file list.
