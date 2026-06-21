# All Work And Members Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the Dashboard date-range picker on All Work and prevent the Admin/Engineer Members picker from being clipped.

**Architecture:** Extend the All Work query contract from a single month to the shared `CmDateFilterInput`, parse it with the existing Bangkok-aware filter module, and preserve those parameters through every All Work navigation helper. Keep Members data behavior unchanged and remove only the parent overflow clipping that hides its absolute-positioned calendar.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, Tailwind CSS, Vitest, Testing Library

---

## File Map

- Modify `components/filter-bar.tsx`: replace the native month input with `CmDateFilterBar`.
- Create `components/filter-bar.test.tsx`: verify the shared picker fields are rendered.
- Modify `app/work/page.tsx`: parse Bangkok date ranges, filter `createdAt`, and preserve date parameters in links and pagination.
- Create `app/work/work-date-filter.test.ts`: verify All Work source wiring and parameter preservation.
- Modify `app/members/page.tsx`: allow the calendar overlay to escape the parent while preserving rounded hero corners.
- Create `app/members/page.test.ts`: guard against calendar clipping and role behavior regressions.

### Task 1: Replace The All Work Month Input

**Files:**
- Modify: `components/filter-bar.tsx`
- Create: `components/filter-bar.test.tsx`

- [ ] **Step 1: Write the failing FilterBar test**

Render `FilterBar` with `mode: "range"`, `startDate: "2026-01-01"`, and `endDate: "2026-01-31"`. Assert that hidden inputs named `mode`, `startDate`, and `endDate` contain those values and that no input with `type="month"` exists.

```tsx
expect(container.querySelector('input[name="mode"]')).toHaveAttribute("value", "range");
expect(container.querySelector('input[name="startDate"]')).toHaveAttribute("value", "2026-01-01");
expect(container.querySelector('input[name="endDate"]')).toHaveAttribute("value", "2026-01-31");
expect(container.querySelector('input[type="month"]')).toBeNull();
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npm.cmd test -- components/filter-bar.test.tsx --run
```

Expected: FAIL because `FilterBar` still renders the native month input and does not render shared range fields.

- [ ] **Step 3: Implement the shared picker**

Import `CmDateFilterBar` and extend `FilterValues` with the shared date fields:

```ts
type FilterValues = {
  search?: string;
  status?: string;
  categoryId?: string;
  zoneId?: string;
  urgency?: string;
  claimantId?: string;
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
};
```

Replace the native month label with:

```tsx
<CmDateFilterBar
  defaultMode={values.mode}
  defaultDate={values.date}
  defaultStartDate={values.startDate}
  defaultEndDate={values.endDate}
  defaultMonth={values.month}
  defaultYear={values.year}
/>
```

Adjust the second filter grid so the picker and action buttons remain usable at responsive widths.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
npm.cmd test -- components/filter-bar.test.tsx --run
```

Expected: PASS.

### Task 2: Connect All Work Date Filtering And Navigation

**Files:**
- Modify: `app/work/page.tsx`
- Create: `app/work/work-date-filter.test.ts`

- [ ] **Step 1: Write failing source-wiring tests**

Read `app/work/page.tsx` and assert it imports and calls `parseCmDateFilter`, builds `createdAt` from `start` and `endExclusive`, and includes every date key in navigation helpers:

```ts
expect(source).toContain('import { parseCmDateFilter');
expect(source).toContain("dateFilter.start");
expect(source).toContain("dateFilter.endExclusive");
for (const key of ["mode", "date", "startDate", "endDate", "month", "year"]) {
  expect(source).toContain(`"${key}"`);
}
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npm.cmd test -- app/work/work-date-filter.test.ts --run
```

Expected: FAIL because All Work still uses `monthRange()`.

- [ ] **Step 3: Implement Bangkok-aware filtering**

Extend `WorkSearchParams` with `CmDateFilterInput`, parse it once after normalizing search parameters, and pass the parsed result into `buildWorkWhere`:

```ts
type WorkSearchParams = CmDateFilterInput & {
  search?: string;
  status?: string;
  statusGroup?: string;
  categoryId?: string;
  zoneId?: string;
  urgency?: string;
  claimantId?: string;
  page?: string;
};

const dateFilter = safeParseDateFilter(filters);
const where = buildWorkWhere(filters, dateFilter);
```

Apply the date range:

```ts
if (dateFilter.start && dateFilter.endExclusive) {
  where.createdAt = { gte: dateFilter.start, lt: dateFilter.endExclusive };
}
```

Use the same date filter in `statusSummaryWhere` and remove `monthRange()`.

- [ ] **Step 4: Preserve date parameters through every All Work URL**

Define a single key list:

```ts
const workFilterKeys = [
  "search", "status", "statusGroup", "categoryId", "zoneId", "urgency", "claimantId",
  "mode", "date", "startDate", "endDate", "month", "year",
] as const;
```

Use it in `buildWorkListHref`, `buildPageHref`, and a status-specific version that omits only `status`, `statusGroup`, and `page` before adding the new status.

- [ ] **Step 5: Run GREEN**

Run:

```powershell
npm.cmd test -- app/work/work-date-filter.test.ts components/filter-bar.test.tsx --run
```

Expected: PASS.

### Task 3: Unclip The Members Calendar

**Files:**
- Modify: `app/members/page.tsx`
- Create: `app/members/page.test.ts`

- [ ] **Step 1: Write the failing Members layout test**

Read the page source and assert the outer member filter section no longer contains `overflow-hidden`, the hero header contains `rounded-t-3xl`, and the role guard remains present:

```ts
expect(source).not.toContain('section className="overflow-hidden rounded-3xl');
expect(source).toContain("rounded-t-3xl");
expect(source).toContain("canSeeMetrics ? (");
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npm.cmd test -- app/members/page.test.ts --run
```

Expected: FAIL because the outer section currently clips absolute children.

- [ ] **Step 3: Implement the minimal layout fix**

Remove `overflow-hidden` from the parent section and add `rounded-t-3xl` to the gradient hero container. Do not change `canSeeMetrics`, member queries, or workload metrics.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
npm.cmd test -- app/members/page.test.ts --run
```

Expected: PASS.

### Task 4: Full Verification

**Files:**
- Verify all modified files from Tasks 1-3.

- [ ] **Step 1: Run automated verification**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: zero test failures, TypeScript exit 0, build exit 0, and no whitespace errors.

- [ ] **Step 2: Verify Local behavior**

With a logged-in Admin or Engineer account:

1. Open `/work`, select a multi-month date range, apply another filter, click a status card, and move between pagination pages. Confirm the date range remains selected.
2. Open `/members`, open the picker, and confirm the full calendar appears above surrounding content without clipping.
3. Check a mobile viewport and confirm the single-month picker remains within the screen.

- [ ] **Step 3: Commit when requested**

```powershell
git add components/filter-bar.tsx components/filter-bar.test.tsx app/work/page.tsx app/work/work-date-filter.test.ts app/members/page.tsx app/members/page.test.ts
git commit -m "fix: align work and members date pickers"
```
