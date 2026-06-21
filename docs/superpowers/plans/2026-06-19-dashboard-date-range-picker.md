# Dashboard Date Range Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard date-mode fields with the approved responsive Thai date range picker and preset ranges.

**Architecture:** Keep all date-range calculations in pure Bangkok-calendar helpers and let a focused client component manage only draft UI state. The existing query-string contract and `parseCmDateFilter` remain the server boundary, so public and authenticated dashboards share identical behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, date-fns, lucide-react, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Bangkok Preset Ranges

**Files:**
- Create: `modules/filters/cm-date-filter-presets.ts`
- Create: `modules/filters/cm-date-filter-presets.test.ts`

- [ ] **Step 1: Write failing tests for preset ranges**

```ts
expect(getCmDatePreset("last7", now)).toEqual({ startDate: "2026-06-13", endDate: "2026-06-19" });
expect(getCmDatePreset("monthToDate", now)).toEqual({ startDate: "2026-06-01", endDate: "2026-06-19" });
expect(getCmDatePreset("yearToDate", now)).toEqual({ startDate: "2026-01-01", endDate: "2026-06-19" });
expect(getCmDatePreset("all", now)).toEqual({ mode: "all" });
```

- [ ] **Step 2: Verify the tests fail because the helper is missing**

Run: `npm.cmd test -- modules/filters/cm-date-filter-presets.test.ts`
Expected: FAIL because `cm-date-filter-presets` cannot be resolved.

- [ ] **Step 3: Implement pure preset calculations**

```ts
export type CmDatePresetKey = "last7" | "last14" | "last30" | "last3Months" | "last12Months" | "monthToDate" | "quarterToDate" | "yearToDate" | "all" | "custom";

export function getCmDatePreset(key: CmDatePresetKey, now = new Date()) {
  // Read the Bangkok calendar date, calculate an inclusive range, and return ISO calendar strings.
}
```

- [ ] **Step 4: Run the preset tests and keep them green**

Run: `npm.cmd test -- modules/filters/cm-date-filter-presets.test.ts`
Expected: PASS.

### Task 2: Responsive Date Range Picker

**Files:**
- Create: `components/cm-date-range-picker.tsx`
- Create: `components/cm-date-range-picker.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

```tsx
render(<CmDateRangePicker defaultStartDate="2026-06-01" defaultEndDate="2026-06-19" />);
fireEvent.click(screen.getByRole("button", { name: /1 มิ.ย. 2569/ }));
expect(screen.getByRole("dialog", { name: "เลือกช่วงวันที่" })).toBeTruthy();
fireEvent.click(screen.getByRole("button", { name: "7 วันล่าสุด" }));
expect(screen.getByLabelText("วันเริ่มต้น")).toHaveValue("2026-06-13");
```

- [ ] **Step 2: Verify the tests fail because the component is missing**

Run: `npm.cmd test -- components/cm-date-range-picker.test.tsx`
Expected: FAIL because `CmDateRangePicker` cannot be resolved.

- [ ] **Step 3: Implement the picker shell and calendar grid**

```tsx
export function CmDateRangePicker(props: CmDateRangePickerProps) {
  // Maintain open/draft/month state, render hidden startDate/endDate/mode fields,
  // and expose preset, custom date, cancel, apply, Escape, and outside-click behavior.
}
```

Use two calendar panels from `md` upward and hide the second panel below `md`. Render Buddhist Era month labels while keeping hidden form values in Gregorian ISO format.

- [ ] **Step 4: Run interaction tests**

Run: `npm.cmd test -- components/cm-date-range-picker.test.tsx`
Expected: PASS for open, preset, custom range, cancel, apply, and Escape behavior.

### Task 3: Replace Existing Date Inputs

**Files:**
- Modify: `components/cm-date-filter-bar.tsx`
- Modify: `components/cm-date-filter-bar.test.tsx`
- Modify: `components/dashboard-filter-bar.tsx`

- [ ] **Step 1: Change the filter-bar tests to require one range picker**

```tsx
render(<CmDateFilterBar defaultMode="range" defaultStartDate="2026-06-01" defaultEndDate="2026-06-19" />);
expect(screen.getByRole("button", { name: /1 มิ.ย. 2569/ })).toBeTruthy();
expect(screen.queryByLabelText("Date view")).toBeNull();
```

- [ ] **Step 2: Verify the changed test fails against the current select and inputs**

Run: `npm.cmd test -- components/cm-date-filter-bar.test.tsx`
Expected: FAIL because the old `Date view` select still exists.

- [ ] **Step 3: Compose the picker into the shared filter bar**

```tsx
return (
  <>
    <CmDateRangePicker defaultMode={defaultMode} defaultStartDate={startDate} defaultEndDate={endDate} />
    <TerminalStatusCheckbox defaultChecked={defaultIncludeTerminal} />
  </>
);
```

Normalize legacy `day`, `month`, and `year` query values into picker start/end defaults so bookmarked URLs still display correctly. Submission emits only `range` or `all` for new interactions.

- [ ] **Step 4: Run shared filter tests**

Run: `npm.cmd test -- components/cm-date-filter-bar.test.tsx modules/filters/cm-date-filter.test.ts`
Expected: PASS.

### Task 4: Verify Dashboard and Public Integration

**Files:**
- Modify only if verification reveals a compatibility issue: `app/dashboard/page.tsx`
- Modify only if verification reveals a compatibility issue: `app/page.tsx`
- Delete temporary mockup: `public/date-picker-mockup.html`

- [ ] **Step 1: Run focused dashboard tests**

Run: `npm.cmd test -- modules/dashboard/dashboard-query.test.ts modules/dashboard/dashboard-chart-data.test.ts components/cm-date-range-picker.test.tsx components/cm-date-filter-bar.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run the complete test and type checks**

Run: `npm.cmd test`
Expected: all test files pass.

Run: `npx.cmd tsc --noEmit`
Expected: exit code 0.

- [ ] **Step 3: Run a production build**

Run: `npm.cmd run build`
Expected: Next.js build completes successfully.

- [ ] **Step 4: Verify responsive behavior in the local browser**

Open `/` and `/dashboard` at 1440x900 and 390x844. Confirm two calendars on desktop, one calendar and horizontally scrolling presets on mobile, no clipping, and no console errors.

- [ ] **Step 5: Remove the temporary approved mockup**

Delete `public/date-picker-mockup.html` after the real component matches the approved layout.
