# Dashboard, Members, and Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the shared date/activity semantics to dashboards and work lists, redesign the trend chart, add role-aware member workload views, and export filtered Excel/PDF reports.

**Architecture:** Build a pure historical-status selector and bucket builder, then use one Prisma query adapter for Dashboard, Public Dashboard, Work List, Members, and Report. Keep authorization in server-side services. Generate previews and exports from the same normalized report filter so downloaded files cannot diverge from the screen.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, Vitest, xlsx, printable HTML/PDF route, Tailwind CSS

---

## File Map

- Create `modules/cm-work/cm-activity-window.ts`: select latest in-range status and terminal filtering.
- Create `modules/cm-work/cm-activity-window.test.ts`: historical semantics tests.
- Modify `modules/dashboard/dashboard-query.ts`: activity-aware query and shared filter.
- Modify `modules/dashboard/dashboard-chart-data.ts`: daily/monthly buckets and two-bar data.
- Modify dashboard/chart tests.
- Modify `components/dashboard-charts.tsx`, `app/dashboard/page.tsx`, and `app/page.tsx`: wider compact bars.
- Create `modules/members/member-query.ts` and test.
- Create `app/members/page.tsx`: role-aware member cards and filters.
- Modify `modules/auth/permission.ts` and test: workload visibility.
- Create `modules/reports/report-filter.ts`, `modules/reports/report-query.ts`, and tests.
- Rebuild `app/reports/page.tsx` and `app/reports/export/route.ts`.
- Create `app/reports/print/page.tsx`: PDF-friendly report view.

### Task 1: Select Historical Status Within a Date Window

**Files:**
- Create: `modules/cm-work/cm-activity-window.ts`
- Test: `modules/cm-work/cm-activity-window.test.ts`

- [ ] **Step 1: Write failing historical selection tests**

```ts
import { describe, expect, it } from "vitest";
import { selectWorkAtWindow } from "./cm-activity-window";
import { WorkStatus } from "./cm-work-types";

const window = { start: new Date("2025-12-31T17:00:00Z"), endExclusive: new Date("2026-01-31T17:00:00Z") };

describe("CM activity window", () => {
  it("returns the latest status event inside the window", () => {
    const result = selectWorkAtWindow({
      createdAt: new Date("2025-12-01T00:00:00Z"),
      currentStatus: WorkStatus.IN_PROGRESS,
      history: [
        { toStatus: WorkStatus.CLAIMED, changedAt: new Date("2026-01-05T00:00:00Z") },
        { toStatus: WorkStatus.IN_PROGRESS, changedAt: new Date("2026-01-15T00:00:00Z") },
      ],
    }, window, false);
    expect(result?.status).toBe(WorkStatus.IN_PROGRESS);
  });

  it("excludes currently closed work unless terminal work is requested", () => {
    const work = {
      createdAt: new Date("2025-12-01T00:00:00Z"),
      currentStatus: WorkStatus.CLOSED,
      history: [{ toStatus: WorkStatus.WAITING_TO_CLOSE, changedAt: new Date("2026-01-15T00:00:00Z") }],
    };
    expect(selectWorkAtWindow(work, window, false)).toBeNull();
    expect(selectWorkAtWindow(work, window, true)?.status).toBe(WorkStatus.WAITING_TO_CLOSE);
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/cm-work/cm-activity-window.test.ts`

Expected: FAIL because the selector is missing.

- [ ] **Step 3: Implement the pure selector**

```ts
import { WorkStatus, type WorkStatus as WorkStatusValue } from "./cm-work-types";

type ActivityWork = {
  createdAt: Date;
  currentStatus: string;
  history: { toStatus: string; changedAt: Date }[];
};

export function selectWorkAtWindow(work: ActivityWork, window: { start: Date; endExclusive: Date }, includeTerminal: boolean) {
  const terminal = work.currentStatus === WorkStatus.CLOSED || work.currentStatus === WorkStatus.CANCELED;
  if (terminal && !includeTerminal) return null;
  const inRange = work.history
    .filter((event) => event.changedAt >= window.start && event.changedAt < window.endExclusive)
    .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  if (inRange[0]) return { status: inRange[0].toStatus as WorkStatusValue, activityAt: inRange[0].changedAt };
  if (work.createdAt >= window.start && work.createdAt < window.endExclusive) {
    return { status: WorkStatus.NEW, activityAt: work.createdAt };
  }
  return null;
}
```

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- modules/cm-work/cm-activity-window.test.ts`

Expected: all tests PASS.

```powershell
git add modules/cm-work/cm-activity-window.ts modules/cm-work/cm-activity-window.test.ts
git commit -m "feat: derive CM status within activity windows"
```

### Task 2: Apply the Activity Window to Dashboard and Work List Queries

**Files:**
- Modify: `modules/dashboard/dashboard-query.ts`
- Modify: `modules/dashboard/dashboard-query.test.ts`
- Modify: `lib/query-cache.ts`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/work/page.tsx`

- [ ] **Step 1: Add failing query contract tests**

Extend `dashboard-query.test.ts` to assert `parseCmDateFilter()` output is accepted by `loadDashboardSummary`, and that cache keys include the serialized date filter rather than only `this-month/last-3-months/last-6-months`.

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/dashboard/dashboard-query.test.ts`

Expected: FAIL because the dashboard still accepts `DashboardTimeRangeFilter`.

- [ ] **Step 3: Update the Prisma candidate query**

Build candidate `where` with Category plus:

```ts
const activityWhere: Prisma.CmWorkWhereInput = window
  ? {
      OR: [
        { createdAt: { gte: window.start, lt: window.endExclusive } },
        { statusHistory: { some: { changedAt: { gte: window.start, lt: window.endExclusive } } } },
      ],
    }
  : {};
```

Fetch candidate works with status history inside the window, map through `selectWorkAtWindow`, then derive all counts from that selected set. For large datasets, use selected IDs for grouped follow-up queries rather than repeatedly querying all rows.

- [ ] **Step 4: Replace the cache contract**

Cache by a stable serialized filter key containing category, mode, start ISO, end ISO, bucket, and includeTerminal. Revalidate with the existing `dashboardSummary` tag.

- [ ] **Step 5: Wire the same parser into the public dashboard, authenticated dashboard, and work list**

Parse URL params with `parseCmDateFilter`, pass the normalized filter to query functions, and preserve it in links to `/work`.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- modules/dashboard/dashboard-query.test.ts modules/cm-work/cm-activity-window.test.ts`

Expected: all tests PASS.

```powershell
git add modules/dashboard/dashboard-query.ts modules/dashboard/dashboard-query.test.ts lib/query-cache.ts app/dashboard/page.tsx app/page.tsx app/work/page.tsx
git commit -m "feat: filter dashboards by CM activity windows"
```

### Task 3: Build Daily and Monthly Two-Bar Trend Data

**Files:**
- Modify: `modules/dashboard/dashboard-chart-data.ts`
- Modify: `modules/dashboard/dashboard-chart-data.test.ts`

- [ ] **Step 1: Write failing daily/monthly bucket tests**

```ts
it("uses Bangkok daily buckets for a short range", () => {
  const rows = buildCmTrend([
    { activityAt: new Date("2026-01-01T16:30:00Z"), status: WorkStatus.NEW },
    { activityAt: new Date("2026-01-01T17:30:00Z"), status: WorkStatus.IN_PROGRESS },
  ], { start: new Date("2025-12-31T17:00:00Z"), endExclusive: new Date("2026-01-02T17:00:00Z"), bucket: "day" });
  expect(rows.map((row) => row.key)).toEqual(["2026-01-01", "2026-01-02"]);
  expect(rows[0].newCount).toBe(1);
  expect(rows[1].statusCounts.IN_PROGRESS).toBe(1);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/dashboard/dashboard-chart-data.test.ts`

Expected: FAIL because `buildCmTrend` is missing.

- [ ] **Step 3: Implement `buildCmTrend`**

Return `{ key, label, newCount, followUpTotal, statusCounts }[]`. Use Bangkok calendar keys for day buckets and month keys for month buckets. Exclude Closed/Cancelled from `followUpTotal` unless `includeTerminal` is true.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- modules/dashboard/dashboard-chart-data.test.ts`

Expected: all tests PASS.

```powershell
git add modules/dashboard/dashboard-chart-data.ts modules/dashboard/dashboard-chart-data.test.ts
git commit -m "feat: build responsive daily and monthly CM trends"
```

### Task 4: Render Wider, Tighter Trend Bars

**Files:**
- Modify: `components/dashboard-charts.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/chart-motion.test.ts`

- [ ] **Step 1: Add a failing markup/style contract test**

Assert chart markup contains `cm-trend-group`, `cm-trend-new-bar`, `cm-trend-status-bar`, and a horizontally scrollable viewport, and CSS provides bar widths of at least 24 px on mobile and 32 px on desktop.

- [ ] **Step 2: Run RED**

Run: `npm test -- app/chart-motion.test.ts`

Expected: FAIL because the new class contract is absent.

- [ ] **Step 3: Update the chart component**

Use `grid-auto-columns: minmax(74px, 1fr)` for six months, two bars of `clamp(24px, 2.4vw, 36px)`, an 8 px intra-group gap, and a 12-20 px inter-group gap. Keep stacked status colors identical to Status Overview and use the new daily/monthly title supplied by query data.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- app/chart-motion.test.ts modules/dashboard/dashboard-chart-data.test.ts`

Expected: all tests PASS.

```powershell
git add components/dashboard-charts.tsx app/dashboard/page.tsx app/page.tsx app/globals.css app/chart-motion.test.ts
git commit -m "feat: refine CM trend chart proportions"
```

### Task 5: Add the Role-Aware Members Page

**Files:**
- Create: `modules/members/member-query.ts`
- Test: `modules/members/member-query.test.ts`
- Create: `app/members/page.tsx`
- Modify: `modules/auth/permission.ts`
- Modify: `modules/auth/permission.test.ts`
- Modify: `components/app-nav-links.tsx`

- [ ] **Step 1: Write failing permission and metric tests**

```ts
it("shows workload metrics only to admin and engineer", () => {
  expect(canViewMemberWorkload(RoleName.ADMIN)).toBe(true);
  expect(canViewMemberWorkload(RoleName.ENGINEER)).toBe(true);
  expect(canViewMemberWorkload(RoleName.TECHNICIAN)).toBe(false);
});
```

Test `calculateMemberMetrics()` with one active claimed work, one closed event inside the window, and one cancelled work; expect `{ active: 1, closed: 1 }`.

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/auth/permission.test.ts modules/members/member-query.test.ts`

Expected: FAIL because member helpers are missing.

- [ ] **Step 3: Implement permission and query service**

Add `canViewMemberWorkload(role)` and a server query that returns active users with category/profile photo. Only query and attach metrics when the viewer is Admin/Engineer. Closed count uses Closed status-history events inside the selected window; active count uses current non-terminal claimed work with in-range activity.

- [ ] **Step 4: Build `/members`**

Render responsive member rows/cards, shared date/category filter, avatars, identity fields, and metrics conditionally. Admin/Engineer member cards build `/work?claimant=${member.id}` while Technician cards are non-interactive.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- modules/auth/permission.test.ts modules/members/member-query.test.ts`

Expected: all tests PASS.

```powershell
git add modules/members app/members/page.tsx modules/auth/permission.ts modules/auth/permission.test.ts components/app-nav-links.tsx
git commit -m "feat: add role-aware member workload view"
```

### Task 6: Rebuild Filtered Reports and Exports

**Files:**
- Create: `modules/reports/report-filter.ts`
- Create: `modules/reports/report-query.ts`
- Test: `modules/reports/report-query.test.ts`
- Modify: `app/reports/page.tsx`
- Modify: `app/reports/export/route.ts`
- Create: `app/reports/print/page.tsx`
- Modify: `lib/excel.ts`

- [ ] **Step 1: Write failing filter parity tests**

```ts
it("uses the same normalized filter for preview and export", () => {
  const params = new URLSearchParams("mode=month&month=2026-06&status=IN_PROGRESS&category=electrical");
  const preview = parseReportFilter(params);
  const exported = parseReportFilter(params);
  expect(exported).toEqual(preview);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- modules/reports/report-query.test.ts`

Expected: FAIL because report modules are missing.

- [ ] **Step 3: Implement report filter and query**

Normalize date, status, category, zone, urgency, claimant, requester, department, machineName, and number. Build one Prisma `where`/activity-window service used by both preview and export. Return paginated preview rows and a count.

- [ ] **Step 4: Rebuild the report page**

Fix mojibake labels. Render all filters, active filter summary, result count, first 50 preview rows, Excel link, and Print/PDF link. Keep role checks server-side.

- [ ] **Step 5: Update export endpoints**

Excel route writes the normalized rows via `createCmWorkWorkbook`. Print route renders a clean A4 HTML table without app navigation/background so browser Print can save PDF. Both record an `EXPORT_REPORT` audit event containing filter summary and row count.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- modules/reports/report-query.test.ts`

Expected: all tests PASS.

```powershell
git add modules/reports app/reports lib/excel.ts
git commit -m "feat: add filtered Excel and PDF reports"
```

### Task 7: Phase 2 Verification

- [ ] **Step 1: Run focused and full tests**

Run: `npm test -- modules/cm-work/cm-activity-window.test.ts modules/dashboard modules/members modules/reports modules/auth/permission.test.ts app/chart-motion.test.ts`

Expected: all focused tests PASS.

Run: `npm test`

Expected: 0 failed tests.

- [ ] **Step 2: Build**

Run: `npm run build:vercel`

Expected: exit 0.

- [ ] **Step 3: Browser/data verification**

Using Development Supabase only, create controlled works crossing Bangkok midnight and terminal transitions. Verify Dashboard/Public/Work List/Report totals match, Members privacy by all three roles, chart density at mobile/desktop, and preview/Excel/PDF row parity.

- [ ] **Step 4: Record the verification result**

If a check fails, return to the owning task, add a regression test that reproduces the failure, apply the minimal fix, rerun all Phase 2 checks, and commit only the files listed by that task.
