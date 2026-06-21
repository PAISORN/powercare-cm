# Single-Month Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-month preset date dialog with one compact month while preserving cross-month range selection and remove the terminal-work checkbox.

**Architecture:** Keep the existing hidden `mode`, `startDate`, and `endDate` form contract. Simplify only the shared React components and dashboard grid so server-side date parsing remains unchanged.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Lock the interaction with tests

**Files:**
- Modify: `components/cm-date-range-picker.test.tsx`
- Modify: `components/cm-date-filter-bar-options.test.tsx`

- [ ] Add a test that opens January 2026, selects January 1, advances twice, selects March 27, applies, and asserts hidden values `2026-01-01` and `2026-03-27`.
- [ ] Assert that only one month heading is visible and preset labels such as `7 วันล่าสุด` are absent.
- [ ] Assert that `รวมงานปิดแล้ว / ยกเลิก` never renders.
- [ ] Run `npm.cmd test -- components/cm-date-range-picker.test.tsx components/cm-date-filter-bar-options.test.tsx` and confirm the new assertions fail.

### Task 2: Simplify shared date-filter components

**Files:**
- Modify: `components/cm-date-range-picker.tsx`
- Modify: `components/cm-date-filter-bar.tsx`
- Modify: `components/dashboard-filter-bar.tsx`
- Modify: `components/report-filter-form.tsx`
- Modify: `app/members/page.tsx`

- [ ] Remove preset imports, state handlers, and preset markup from `CmDateRangePicker`.
- [ ] Render one `CalendarMonth` with both previous and next controls inside a maximum 420px dialog.
- [ ] Remove terminal-work props and checkbox markup from `CmDateFilterBar`.
- [ ] Remove obsolete props at every caller and change the dashboard desktop tracks to `1.1fr 1.4fr auto auto`.
- [ ] Run the focused component tests and confirm they pass.

### Task 3: Verify the shared filter

**Files:**
- Test: `components/cm-date-range-picker.test.tsx`
- Test: `components/cm-date-filter-bar.test.tsx`
- Test: `components/cm-date-filter-bar-options.test.tsx`

- [ ] Run `npm.cmd test -- components/cm-date-range-picker.test.tsx components/cm-date-filter-bar.test.tsx components/cm-date-filter-bar-options.test.tsx`.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Request `/` and `/dashboard` from the local server and confirm HTTP 200.
