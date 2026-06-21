# LINE Work Category Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Thai work-category line to every CM work notification sent through LINE.

**Architecture:** Keep routing and delivery unchanged. Extend the shared `formatLineWorkMessage` formatter with a small category-label mapping so all existing LINE work events automatically receive the new line.

**Tech Stack:** TypeScript, Vitest, Next.js

---

### Task 1: Format LINE work category

**Files:**
- Modify: `modules/line/line-work-event.test.ts`
- Modify: `modules/line/line-work-event.ts`

- [x] **Step 1: Write failing formatter tests**

Extend the formatter test to assert these mappings:

```ts
expect(formatLineWorkMessage(electricalEvent)).toContain("ประเภทงาน: งานไฟฟ้า");
expect(formatLineWorkMessage(mechanicalEvent)).toContain("ประเภทงาน: งานเครื่องกล");
expect(formatLineWorkMessage(eventWithoutCategory)).toContain("ประเภทงาน: ไม่ระบุ");
```

Also verify that the category line appears before the machine line:

```ts
expect(message.indexOf("ประเภทงาน:")).toBeLessThan(message.indexOf("เครื่องจักร:"));
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm test -- modules/line/line-work-event.test.ts
```

Expected: FAIL because the current formatter does not include `ประเภทงาน`.

- [x] **Step 3: Add the minimal category label mapping**

Add a focused helper in `modules/line/line-work-event.ts`:

```ts
function getWorkCategoryLabel(categoryId: string | null) {
  if (categoryId === "electrical") return "งานไฟฟ้า";
  if (categoryId === "mechanical") return "งานเครื่องกล";
  return "ไม่ระบุ";
}
```

Insert the line after status and before machine name:

```ts
`ประเภทงาน: ${getWorkCategoryLabel(event.categoryId)}`,
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm test -- modules/line/line-work-event.test.ts
```

Expected: all tests in `line-work-event.test.ts` PASS.

- [x] **Step 5: Run LINE regression tests and TypeScript check**

Run:

```powershell
npm test -- modules/line
npx tsc --noEmit
```

Expected: all LINE tests PASS and TypeScript exits without errors.

- [x] **Step 6: Review the final diff**

Run:

```powershell
git diff -- modules/line/line-work-event.ts modules/line/line-work-event.test.ts
```

Expected: only the category-label behavior and its tests changed. Do not commit or push until explicitly requested.
