# Global Scroll Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the dashboard-style soft entrance and scroll reveal to content sections on every page while keeping navigation stable and long or responsive content visible.

**Architecture:** Keep one `RevealOnScroll` controller mounted by the root layout. Replace depth-specific selectors with semantic discovery inside `main`, support an explicit opt-out, and retain one-time IntersectionObserver reveals with a low threshold. CSS owns motion duration, responsive travel distance, reduced-motion behavior, and print safety.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS, Vitest, Testing Library

---

## File Map

- Modify `components/reveal-on-scroll.tsx`: discover nested semantic content surfaces and ignore opted-out elements.
- Modify `components/reveal-on-scroll.test.tsx`: protect nested discovery, opt-out, one-time reveal, tall-section threshold, and reduced-motion behavior.
- Modify `app/globals.css`: refine mobile motion and guarantee visible print output.

### Task 1: Discover Content Surfaces At Any Nesting Depth

**Files:**
- Modify: `components/reveal-on-scroll.test.tsx`
- Modify: `components/reveal-on-scroll.tsx`

- [ ] **Step 1: Write the failing nested-content and opt-out tests**

Add tests that render a deeply nested card and an ignored card:

```tsx
it("registers semantic content nested anywhere inside main", () => {
  render(
    <main>
      <div>
        <div>
          <div>
            <article>Nested result card</article>
          </div>
        </div>
      </div>
      <RevealOnScroll />
    </main>,
  );

  const card = screen.getByText("Nested result card").closest("article") as HTMLElement;
  expect(card.dataset.revealed).toBe("false");
  expect(observe).toHaveBeenCalledWith(card);
});

it("does not register content explicitly excluded from reveal", () => {
  render(
    <main>
      <section data-reveal-ignore>Stable content</section>
      <RevealOnScroll />
    </main>,
  );

  const section = screen.getByText("Stable content").closest("section") as HTMLElement;
  expect(section.dataset.scrollReveal).toBeUndefined();
  expect(observe).not.toHaveBeenCalledWith(section);
});
```

- [ ] **Step 2: Run the focused tests and confirm the nested test fails**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx --run`

Expected: the nested article has no `data-revealed` value because the existing selector only supports fixed nesting depths.

- [ ] **Step 3: Replace depth-specific discovery with semantic main-content discovery**

Use this selector in `components/reveal-on-scroll.tsx`:

```ts
const revealSelector = [
  "main section:not([data-reveal-ignore])",
  "main article:not([data-reveal-ignore])",
  "main form:not([data-reveal-ignore])",
  "[data-reveal-section]:not([data-reveal-ignore])",
].join(",");
```

Keep the existing `threshold: 0.01`, MutationObserver registration, reduced-motion fallback, and one-time `unobserve` behavior.

- [ ] **Step 4: Run the focused tests and confirm they pass**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx --run`

Expected: all reveal component tests pass.

### Task 2: Make Motion Responsive And Print-Safe

**Files:**
- Modify: `app/globals.css`
- Test: `components/reveal-on-scroll.test.tsx`

- [ ] **Step 1: Write a failing CSS contract test**

Add a test that reads `app/globals.css` and verifies mobile and print overrides exist:

```tsx
import fs from "node:fs";
import path from "node:path";

it("defines mobile and print-safe reveal behavior", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*--cm-reveal-distance: 10px/);
  expect(css).toMatch(/@media print[\s\S]*\[data-scroll-reveal="true"\][\s\S]*opacity: 1/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx --run`

Expected: FAIL because the reveal distance variable and print override do not exist yet.

- [ ] **Step 3: Introduce a shared travel-distance variable and responsive overrides**

Update the reveal declarations in `app/globals.css`:

```css
[data-scroll-reveal="true"] {
  --cm-reveal-distance: 16px;
  transition:
    opacity 550ms ease-out var(--cm-reveal-delay, 0ms),
    transform 550ms ease-out var(--cm-reveal-delay, 0ms);
}

[data-scroll-reveal="true"][data-revealed="false"] {
  opacity: 0;
  transform: translateY(var(--cm-reveal-distance));
  will-change: opacity, transform;
}

@media (max-width: 640px) {
  [data-scroll-reveal="true"] {
    --cm-reveal-distance: 10px;
  }
}

@media print {
  [data-scroll-reveal="true"] {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
```

Retain the existing reduced-motion rule.

- [ ] **Step 4: Run focused tests and confirm they pass**

Run: `npm.cmd test -- components/reveal-on-scroll.test.tsx --run`

Expected: all tests pass.

### Task 3: Full Regression Verification

**Files:**
- Verify: `components/reveal-on-scroll.tsx`
- Verify: `components/reveal-on-scroll.test.tsx`
- Verify: `app/globals.css`

- [ ] **Step 1: Run the complete test suite**

Run: `npm.cmd test -- --run`

Expected: every test file passes with zero failures.

- [ ] **Step 2: Run TypeScript validation**

Run: `npx.cmd tsc --noEmit`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Check representative routes**

Verify `/`, `/dashboard`, `/work`, `/profile`, `/reports`, `/request`, and `/tracking` at desktop and mobile widths. Confirm the header/sidebar remain fixed, first content appears softly, lower cards reveal while scrolling, Work Results remains visible, and no error overlay appears.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check -- components/reveal-on-scroll.tsx components/reveal-on-scroll.test.tsx app/globals.css`

Expected: no whitespace errors and no unrelated files in the diff.
