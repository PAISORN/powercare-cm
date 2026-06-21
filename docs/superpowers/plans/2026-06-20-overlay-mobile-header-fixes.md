# Overlay And Mobile Header Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the date-range calendar above KPI cards and place the mobile menu button immediately before Home.

**Architecture:** Remove the stacking context left behind by completed reveal animations instead of raising individual overlay z-index values. Reorder the two existing mobile header controls without changing either control's behavior or desktop layout.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Release Reveal Stacking Context

**Files:**
- Modify: `components/reveal-on-scroll.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing CSS contract test**

Add this assertion to the existing reveal CSS test:

```ts
expect(css).toMatch(
  /\[data-scroll-reveal="true"\]\[data-revealed="true"\][\s\S]*transform: none/,
);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx --run`

Expected: FAIL because the completed state currently uses `translateY(0)`, which retains a stacking context.

- [ ] **Step 3: Remove the completed transform**

Update `app/globals.css`:

```css
[data-scroll-reveal="true"][data-revealed="true"] {
  opacity: 1;
  transform: none;
  will-change: auto;
}
```

- [ ] **Step 4: Run the focused test and verify success**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx --run`

Expected: all reveal tests pass.

### Task 2: Put Mobile Menu Before Home

**Files:**
- Modify: `components/app-shell.tsx`
- Create: `components/app-shell-layout.test.ts`

- [ ] **Step 1: Write the failing source-order contract test**

Create `components/app-shell-layout.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell mobile header", () => {
  it("places the menu control before Home", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const leadingControls = source.slice(
      source.indexOf('<div className="flex shrink-0 items-center gap-2">'),
      source.indexOf('<div className="min-w-0">', source.indexOf('<div className="flex shrink-0 items-center gap-2">')),
    );

    expect(leadingControls.indexOf("<MobileAppDrawer")).toBeLessThan(leadingControls.indexOf('<Link className="grid h-10'));
  });
});
```

- [ ] **Step 2: Run the layout test and verify failure**

Run: `npm.cmd test -- components/app-shell-layout.test.ts --run`

Expected: FAIL because Home currently appears before `MobileAppDrawer`.

- [ ] **Step 3: Reorder the existing controls**

Move the complete `<MobileAppDrawer ... />` block before the existing Home `<Link>` inside the leading-controls container. Do not change props, class names, routes, icons, or desktop breakpoints.

- [ ] **Step 4: Run both focused test files**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx components/app-shell-layout.test.ts --run`

Expected: both test files pass.

### Task 3: Regression Verification

**Files:**
- Verify: `app/globals.css`
- Verify: `components/app-shell.tsx`

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd test -- --run`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run TypeScript validation**

Run: `npx.cmd tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Review the scoped diff**

Run: `git diff --check -- app/globals.css components/app-shell.tsx components/reveal-on-scroll.test.tsx components/app-shell-layout.test.ts`

Expected: no whitespace errors.
