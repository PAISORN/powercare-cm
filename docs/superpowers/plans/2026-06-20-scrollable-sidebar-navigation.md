# Scrollable Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop sidebar and mobile drawer navigation independently scrollable while keeping brand and user information fixed.

**Architecture:** Convert both navigation containers into full-height flex columns. Give each navigation region flexible remaining height with `min-h-0 overflow-y-auto`, preserving existing links and interaction behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

## File Map

- Modify `components/app-shell.tsx`: desktop fixed-height flex layout and scrollable navigation.
- Modify `components/mobile-app-drawer.tsx`: mobile fixed header/user area and scrollable navigation.
- Modify `components/app-shell-layout.test.ts`: source assertions for desktop scroll containment.
- Modify `components/mobile-app-drawer.test.tsx`: rendered class assertions and existing drawer behavior.

### Task 1: Scrollable Desktop And Mobile Navigation

**Files:**
- Modify: `components/app-shell.tsx`
- Modify: `components/mobile-app-drawer.tsx`
- Modify: `components/app-shell-layout.test.ts`
- Modify: `components/mobile-app-drawer.test.tsx`

- [ ] **Step 1: Write failing desktop and mobile layout tests**

Add a desktop source assertion:

```ts
it("keeps the desktop identity fixed while navigation scrolls", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
  expect(source).toContain("flex h-screen flex-col");
  expect(source).toContain('data-testid="desktop-sidebar-nav"');
  expect(source).toContain("min-h-0 flex-1 overflow-y-auto");
});
```

Extend the mobile drawer test after opening it:

```ts
const navigation = screen.getByTestId("mobile-drawer-nav");
expect(navigation.className).toContain("min-h-0");
expect(navigation.className).toContain("flex-1");
expect(navigation.className).toContain("overflow-y-auto");
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
npm.cmd test -- components/app-shell-layout.test.ts components/mobile-app-drawer.test.tsx --run
```

Expected: FAIL because the sidebar and drawer navigation regions do not yet expose scroll containment.

- [ ] **Step 3: Implement the desktop flex and scroll layout**

Update the desktop aside and navigation:

```tsx
<aside className="fixed inset-y-0 left-0 hidden h-screen w-72 flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex">
  {/* existing brand and user summary */}
  <nav
    className="mt-6 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1"
    data-testid="desktop-sidebar-nav"
  >
    <AppNavLinks role={user.role as RoleName} />
  </nav>
</aside>
```

- [ ] **Step 4: Implement the mobile flex and scroll layout**

Update the mobile navigation while retaining the existing full-height drawer flex column:

```tsx
<nav
  className="mt-6 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1"
  data-testid="mobile-drawer-nav"
>
  <AppNavLinks role={role} onNavigate={() => setOpen(false)} />
</nav>
```

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:

```powershell
npm.cmd test -- components/app-shell-layout.test.ts components/mobile-app-drawer.test.tsx --run
```

Expected: both test files pass.

- [ ] **Step 6: Run full verification**

Run:

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: zero test failures, TypeScript exit 0, production build exit 0, and no whitespace errors.

- [ ] **Step 7: Commit the implementation when requested**

```powershell
git add components/app-shell.tsx components/mobile-app-drawer.tsx components/app-shell-layout.test.ts components/mobile-app-drawer.test.tsx
git commit -m "fix: make application navigation scrollable"
```
