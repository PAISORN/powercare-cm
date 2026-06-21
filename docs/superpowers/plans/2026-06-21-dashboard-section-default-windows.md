# Dashboard Section Default Windows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Dashboard and Public current-year Status/Zone defaults, a latest-six-month trend, and a correctly ordered five-item Priority queue while allowing explicit date filters to override every section.

**Architecture:** Centralize section window resolution and priority ranking in `modules/dashboard/dashboard-query.ts`. Pages only detect whether a date filter is explicit and consume the shared view model; the date picker gains an unset dashboard-default state so its label does not falsely claim one range applies before the user selects a filter.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, date-fns-tz, Vitest, Testing Library

---

## File Map

- Modify `modules/filters/cm-date-filter.ts` and test: detect explicit date selections.
- Modify `modules/dashboard/dashboard-query.ts` and test: resolve current-year/six-month windows and compose section-specific queries.
- Modify `components/cm-date-range-picker.tsx`, `components/cm-date-filter-bar.tsx`, and tests: display an honest dashboard-default state and omit hidden date inputs until applied.
- Modify `components/dashboard-filter-bar.tsx`: enable the dashboard-default picker state.
- Modify `app/dashboard/page.tsx` and `app/page.tsx`: pass `undefined` when no explicit date filter and render the shared five-item queue directly.
- Add `app/dashboard/default-window-usage.test.ts`: guard shared behavior across authenticated and Public pages.

### Task 1: Detect Explicit Filters And Resolve Default Windows

**Files:**
- Modify: `modules/filters/cm-date-filter.ts`
- Modify: `modules/filters/cm-date-filter.test.ts`
- Modify: `modules/dashboard/dashboard-query.ts`
- Modify: `modules/dashboard/dashboard-query.test.ts`

- [ ] **Step 1: Write failing tests**

Test explicit filter detection:

```ts
expect(hasExplicitCmDateFilter({})).toBe(false);
expect(hasExplicitCmDateFilter({ mode: "range", startDate: "2026-01-01", endDate: "2026-01-31" })).toBe(true);
expect(hasExplicitCmDateFilter({ mode: "all" })).toBe(true);
```

Test default section windows with `now = 2026-06-21T03:00:00.000Z`:

```ts
const windows = resolveDashboardSectionWindows(undefined, now);
expect(windows.summary.start).toEqual(new Date("2025-12-31T17:00:00.000Z"));
expect(windows.summary.endExclusive).toEqual(now);
expect(windows.trend.start).toEqual(new Date("2025-12-31T17:00:00.000Z"));
expect(windows.trend.monthCount).toBe(6);
expect(windows.priority).toBeNull();
```

Test an explicit range gives every section the same bounds and an explicit all-time filter gives every section no time restriction.

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- modules/filters/cm-date-filter.test.ts modules/dashboard/dashboard-query.test.ts --run
```

Expected: FAIL because the explicit detector and section resolver do not exist.

- [ ] **Step 3: Implement explicit detection**

Add:

```ts
export function hasExplicitCmDateFilter(input: CmDateFilterInput) {
  return Boolean(input.mode || input.date || input.startDate || input.endDate || input.month || input.year);
}
```

- [ ] **Step 4: Implement Bangkok default windows**

Add a pure `resolveDashboardSectionWindows(dateFilter, now)` function. For no explicit filter:

- Summary starts at Bangkok January 1 and ends at `now`.
- Trend starts at Bangkok January 1 of the month five months before the current month, ends at `now`, and has `monthCount: 6`.
- Priority has no time restriction.

For explicit bounded filters, reuse `start` and `endExclusive` for summary, trend, and priority. For explicit all-time mode, return no time restriction for all three.

- [ ] **Step 5: Run GREEN**

```powershell
npm.cmd test -- modules/filters/cm-date-filter.test.ts modules/dashboard/dashboard-query.test.ts --run
```

Expected: PASS.

### Task 2: Compose Section-Specific Dashboard Queries

**Files:**
- Modify: `modules/dashboard/dashboard-query.ts`
- Modify: `modules/dashboard/dashboard-query.test.ts`

- [ ] **Step 1: Write failing priority ordering tests**

Extract a pure queue composer and test that it returns at most five items in tier order:

```ts
const result = composePriorityQueue({
  critical: criticalRows,
  urgent: urgentRows,
  statusPriority: statusRows,
});
expect(result.map((row) => row.id)).toEqual(["critical-old", "critical-new", "urgent-old", "urgent-new", "waiting-old"]);
expect(result).toHaveLength(5);
```

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- modules/dashboard/dashboard-query.test.ts --run
```

Expected: FAIL because `composePriorityQueue` does not exist.

- [ ] **Step 3: Split query where clauses by section**

Inside `loadDashboardSummary`, build:

```ts
const summaryWhere = { ...categoryWhere, ...toCreatedAtWhere(windows.summary) };
const trendWhere = { ...categoryWhere, ...toCreatedAtWhere(windows.trend) };
const priorityBaseWhere = {
  ...categoryWhere,
  ...toCreatedAtWhere(windows.priority),
  status: { notIn: [WorkStatus.CLOSED, WorkStatus.CANCELED] },
};
```

Use `summaryWhere` for totals, status/category/zone/urgency, latest rows, and average-close calculations. Use `trendWhere` only for monthly works.

- [ ] **Step 4: Query priority tiers safely**

Run three queries, each ordered by `createdAt: "asc"` and limited to five:

1. `urgency: CRITICAL`
2. `urgency: URGENT`
3. `urgency` not Critical/Urgent with status Waiting Close or Returned

Use the existing category/date/status constraints in every tier. Concatenate Critical, Urgent, and status-priority rows, then take five in `composePriorityQueue`. Return the already-limited result as `priorityWorks`.

- [ ] **Step 5: Build trend from its own six-month window**

Use the trend window anchor and month count:

```ts
monthlyTrend: buildMonthlyTrend(monthlyWorks, trendAnchor, windows.trend.monthCount)
```

For an explicit bounded range, calculate month count from the selected start/end. For all-time mode, calculate from the earliest returned work through the current month, with a minimum of one month.

- [ ] **Step 6: Run GREEN**

```powershell
npm.cmd test -- modules/dashboard/dashboard-query.test.ts modules/dashboard/dashboard-chart-data.test.ts --run
```

Expected: PASS.

### Task 3: Add An Honest Dashboard-Default Picker State

**Files:**
- Modify: `components/cm-date-range-picker.tsx`
- Modify: `components/cm-date-range-picker.test.tsx`
- Modify: `components/cm-date-filter-bar.tsx`
- Modify: `components/cm-date-filter-bar.test.tsx`
- Modify: `components/dashboard-filter-bar.tsx`

- [ ] **Step 1: Write failing picker tests**

Render the picker with `initiallyUnset`. Assert:

```tsx
expect(screen.getByRole("button", { name: /Default dashboard periods/i })).toBeTruthy();
expect(container.querySelector('input[name="mode"]')).toBeDisabled();
```

Open the picker, select/apply a range, and assert hidden date fields become enabled.

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- components/cm-date-range-picker.test.tsx components/cm-date-filter-bar.test.tsx --run
```

Expected: FAIL because the unset state is not supported.

- [ ] **Step 3: Implement the unset state**

Add `initiallyUnset?: boolean` to both wrappers. In `CmDateRangePicker`:

- Initialize `hasAppliedFilter` to `!initiallyUnset`.
- Show `Default dashboard periods` before a filter is applied.
- Disable hidden `mode`, `startDate`, and `endDate` inputs while unset so submitting only a Category does not accidentally apply month-to-date.
- Opening the picker starts from the existing month-to-date draft.
- Applying a range or All sets `hasAppliedFilter` to true and enables the hidden fields.

Pass `initiallyUnset={!activeDateFilter}` from `DashboardFilterBar`.

- [ ] **Step 4: Run GREEN**

```powershell
npm.cmd test -- components/cm-date-range-picker.test.tsx components/cm-date-filter-bar.test.tsx --run
```

Expected: PASS.

### Task 4: Connect Dashboard And Public Pages

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/page.tsx`
- Create: `app/dashboard/default-window-usage.test.ts`

- [ ] **Step 1: Write failing page-wiring tests**

Read both page sources and assert they call `hasExplicitCmDateFilter`, pass `undefined` when no explicit filter exists, use the shared dashboard query, and do not slice Priority items in JSX:

```ts
for (const file of ["app/dashboard/page.tsx", "app/page.tsx"]) {
  const source = readFileSync(file, "utf8");
  expect(source).toContain("hasExplicitCmDateFilter");
  expect(source).toContain("getDashboardSummaryForDateFilter");
  expect(source).not.toContain("priorityWorks.slice(0, 5)");
}
```

- [ ] **Step 2: Run RED**

```powershell
npm.cmd test -- app/dashboard/default-window-usage.test.ts --run
```

Expected: FAIL because pages always parse a default month and slice Priority locally.

- [ ] **Step 3: Implement explicit-filter wiring**

In each page:

```ts
const dateInput = readDateFilterInput(params);
const hasExplicitDateFilter = hasExplicitCmDateFilter(dateInput);
const activeDateFilter = hasExplicitDateFilter ? safeParseDateFilter(dateInput) : undefined;
```

Pass `hasExplicitDateFilter ? dateInput : undefined` to `DashboardFilterBar`. Render `summary.priorityWorks.map(...)` directly because the query layer guarantees five items.

- [ ] **Step 4: Update section labels**

When no explicit filter is selected, show concise asides:

- Status Overview: `Current year`
- Monthly CM Trend: `Latest 6 months`
- Plant Zone Workload: `Current year`
- Priority Work Queue: `Top 5 priority`

When explicit filters are active, preserve the existing count/month labels.

- [ ] **Step 5: Run GREEN**

```powershell
npm.cmd test -- app/dashboard/default-window-usage.test.ts app/chart-motion.test.ts --run
```

Expected: PASS.

### Task 5: Full Verification

- [ ] **Step 1: Run automated verification**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: zero failures and exit code 0 for every command.

- [ ] **Step 2: Verify Local pages**

1. Open `/dashboard` and `/`; confirm default labels show Current year, Latest 6 months, Current year, and Top 5 priority.
2. Confirm Trend contains exactly six month buckets on first load.
3. Apply a custom range and confirm every section changes to the selected range.
4. Confirm Priority contains no more than five items in Critical, Urgent, then status-priority order.

- [ ] **Step 3: Commit when requested**

```powershell
git add modules/filters/cm-date-filter.ts modules/filters/cm-date-filter.test.ts modules/dashboard/dashboard-query.ts modules/dashboard/dashboard-query.test.ts components/cm-date-range-picker.tsx components/cm-date-range-picker.test.tsx components/cm-date-filter-bar.tsx components/cm-date-filter-bar.test.tsx components/dashboard-filter-bar.tsx app/dashboard/page.tsx app/page.tsx app/dashboard/default-window-usage.test.ts
git commit -m "feat: add dashboard section default periods"
```
