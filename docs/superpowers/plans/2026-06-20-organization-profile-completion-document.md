# Organization Profile And Completion Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Admin-managed company identity and render its left-aligned logo and company name in a redesigned A4 CM completion document.

**Architecture:** Store organization identity in a singleton `OrganizationProfile` model and store logo bytes through the existing Local/Supabase abstraction. Keep database loading in the print page and move document markup into a pure `CompletionDocument` component so layout behavior is independently testable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma SQLite/PostgreSQL, Supabase Storage, Vitest, Testing Library, Tailwind CSS

---

## File Map

- Modify `prisma/schema.prisma` and `prisma/schema.supabase.prisma`: singleton organization model.
- Create `prisma/supabase-migrations/20260620_organization_profile.sql`: production-ready PostgreSQL schema with RLS.
- Create `modules/organization/organization-profile.ts` and tests: fallback and input validation.
- Modify `modules/auth/permission.ts` and tests: Admin-only management permission.
- Modify `lib/file-storage.ts` and tests: validated versioned organization-logo storage.
- Create `app/organization-logo/route.ts`: authenticated logo delivery.
- Create `app/admin/organization/page.tsx`: Admin form, preview, replacement, and audit.
- Modify `components/app-nav-links.tsx` and tests: Admin Organization menu.
- Create `components/completion-document.tsx` and test: pure A4 document layout.
- Modify `app/work/[id]/print/page.tsx`: load organization and render the document component.

### Task 1: Add Organization Data And Permission

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.supabase.prisma`
- Create: `prisma/supabase-migrations/20260620_organization_profile.sql`
- Create: `modules/organization/organization-profile.ts`
- Create: `modules/organization/organization-profile.test.ts`
- Modify: `modules/auth/permission.ts`
- Modify: `modules/auth/permission.test.ts`

- [ ] **Step 1: Write failing validation and permission tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeOrganizationInput, organizationFallback } from "./organization-profile";

describe("organization profile", () => {
  it("normalizes the company name", () => {
    expect(normalizeOrganizationInput({ companyName: "  บริษัท รุ่งทิวา ไบโอแมส จำกัด  " }))
      .toEqual({ companyName: "บริษัท รุ่งทิวา ไบโอแมส จำกัด" });
  });

  it("rejects an empty company name", () => {
    expect(() => normalizeOrganizationInput({ companyName: " " })).toThrow("Company name is required");
  });

  it("provides the document fallback", () => {
    expect(organizationFallback.companyName).toBe("PowerCare.CM");
  });
});
```

Add to `modules/auth/permission.test.ts`:

```ts
expect(canManageOrganization(RoleName.ADMIN)).toBe(true);
expect(canManageOrganization(RoleName.ENGINEER)).toBe(false);
expect(canManageOrganization(RoleName.TECHNICIAN)).toBe(false);
```

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- modules/organization/organization-profile.test.ts modules/auth/permission.test.ts --run`

Expected: FAIL because the organization module and permission do not exist.

- [ ] **Step 3: Add the model to both Prisma schemas**

```prisma
model OrganizationProfile {
  id              String   @id
  companyName     String
  logoFileName    String?
  logoMimeType    String?
  logoFileSize    Int?
  logoStoragePath String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Create SQL with the same columns, primary key, timestamps, and `ALTER TABLE "OrganizationProfile" ENABLE ROW LEVEL SECURITY;`. Do not add public Data API policies because the application reads through Prisma and the logo route requires an authenticated session.

- [ ] **Step 4: Implement validation, fallback, and permission**

```ts
export const organizationFallback = { companyName: "PowerCare.CM", hasLogo: false };

export function normalizeOrganizationInput(input: { companyName: string }) {
  const companyName = input.companyName.trim();
  if (!companyName) throw new Error("Company name is required");
  if (companyName.length > 200) throw new Error("Company name is too long");
  return { companyName };
}
```

Add `canManageOrganization(role)` returning true only for `RoleName.ADMIN`.

- [ ] **Step 5: Synchronize only Local Development and run GREEN**

Run:

```powershell
npx.cmd prisma format --schema prisma/schema.prisma
npx.cmd prisma format --schema prisma/schema.supabase.prisma
npx.cmd prisma db push --schema prisma/schema.prisma
npx.cmd prisma generate --schema prisma/schema.prisma
npm.cmd test -- modules/organization/organization-profile.test.ts modules/auth/permission.test.ts --run
```

Expected: local SQLite is synchronized and tests pass. Do not apply the Supabase SQL in this task.

### Task 2: Add Organization Logo Storage And Route

**Files:**
- Modify: `lib/file-storage.ts`
- Modify: `lib/file-storage.test.ts`
- Create: `app/organization-logo/route.ts`

- [ ] **Step 1: Write failing storage tests**

Add tests that call `saveOrganizationLogoFile("primary", file)` and assert:

```ts
expect(result.mimeType).toBe("image/webp");
expect(result.fileSize).toBe(file.size);
expect(result.storagePath).toContain("organization-logos");
```

Also assert PDF/GIF files fail with `Organization logo must be PNG, JPG, or WebP` and files over 2 MB fail with `Organization logo must be 2 MB or smaller`.

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- lib/file-storage.test.ts --run`

Expected: FAIL because `saveOrganizationLogoFile` does not exist.

- [ ] **Step 3: Implement versioned Local/Supabase storage**

Add `defaultOrganizationLogosBucket = "powercare-organization-logos"`. Store Supabase objects under `organizations/{organizationId}/{randomUUID()}` and Local files under `storage/organization-logos/{organizationId}/{randomUUID()}.{ext}`. Return `fileName`, `mimeType`, `fileSize`, and `storagePath`. Reuse `uploadSupabaseObject`, `readStoredFile`, and `deleteStoredFile`.

- [ ] **Step 4: Implement authenticated logo route**

`GET /organization-logo` must:

1. Call `requireUser()`.
2. Read `OrganizationProfile` ID `primary`.
3. Return 404 when no logo exists.
4. Read bytes through `readStoredFile`.
5. Return the stored MIME type with private cache headers.

- [ ] **Step 5: Run GREEN**

Run: `npm.cmd test -- lib/file-storage.test.ts --run`

Expected: storage tests pass.

### Task 3: Build Admin Organization Management

**Files:**
- Create: `modules/organization/organization-service.ts`
- Create: `app/admin/organization/page.tsx`
- Modify: `components/app-nav-links.tsx`
- Modify: `components/app-nav-links.test.ts`

- [ ] **Step 1: Write failing navigation test**

```ts
expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/organization")).toBe(true);
expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/organization")).toBe(false);
expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/organization")).toBe(false);
```

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- components/app-nav-links.test.ts --run`

Expected: FAIL because the Organization link is absent.

- [ ] **Step 3: Implement service and safe replacement flow**

`readOrganizationProfile()` returns the database row or `organizationFallback`. `updateOrganizationProfile(actor, input, logo?)` checks `canManageOrganization`, upserts ID `primary`, and records `UPDATE_ORGANIZATION_PROFILE`. The audit payload stores company name and `hasLogo`, never image bytes or storage credentials.

The server action follows this order:

1. Validate file and save a new versioned object when supplied.
2. Upsert the database record.
3. Delete the newly uploaded object if the database update fails.
4. Delete the previous object only after the database update succeeds and paths differ.

- [ ] **Step 4: Build the Admin page and navigation**

Add `Organization` with a `Building2` icon to Admin links. The page shows a left-side logo preview, company-name input, optional replacement upload, PNG/JPG/WebP 2 MB guidance, Save button, and success/error notices. Redirect non-Admin roles to `/dashboard`.

- [ ] **Step 5: Run GREEN**

Run: `npm.cmd test -- components/app-nav-links.test.ts modules/organization modules/auth/permission.test.ts --run`

Expected: all tests pass.

### Task 4: Redesign The Completion Document

**Files:**
- Create: `components/completion-document.tsx`
- Create: `components/completion-document.test.tsx`
- Modify: `app/work/[id]/print/page.tsx`

- [ ] **Step 1: Write the failing document structure test**

Render `CompletionDocument` with organization, work, technician, reviewer, and signature URLs. Assert the markup contains:

```ts
expect(markup.indexOf("Company logo")).toBeLessThan(markup.indexOf("ใบสรุปปิดงาน Corrective Maintenance"));
expect(markup).toContain("1. ข้อมูลงานซ่อม");
expect(markup).toContain("2. รายละเอียดงานซ่อม");
expect(markup).toContain("3. การดำเนินการแก้ไข");
expect(markup).toContain("ผู้ดำเนินการ");
expect(markup).toContain("ผู้ตรวจรับ");
```

Add a fallback case with no organization row and assert `PowerCare.CM` appears with no `Company logo` image.

- [ ] **Step 2: Run RED**

Run: `npm.cmd test -- components/completion-document.test.tsx --run`

Expected: FAIL because `CompletionDocument` does not exist.

- [ ] **Step 3: Build the pure A4 component**

Use a white A4 portrait container, dark-green headings, three bordered sections, wrapped label/value rows, and two signature columns. The header grid is `180px minmax(0,1fr)` on print/desktop with the logo in the first cell. Use `object-contain`, a fixed max logo height, and no decorative background image. Add print color adjustment and page-break protection around section headers and signature blocks.

- [ ] **Step 4: Connect the print page**

Load work and organization concurrently. Pass `/organization-logo?v={updatedAt}` only when logo metadata exists. Preserve existing `/signatures/{userId}` URLs and closed-work permission. Remove duplicated old document markup from the route page.

- [ ] **Step 5: Run GREEN**

Run: `npm.cmd test -- components/completion-document.test.tsx modules/documents/completion-document.test.ts --run`

Expected: document tests pass.

### Task 5: Full Verification

- [ ] **Step 1: Run automated verification**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Expected: zero test failures, TypeScript exit 0, build exit 0, and no whitespace errors.

- [ ] **Step 2: Verify Local pages**

With a Local Admin session verify `/admin/organization` returns 200 and displays company name/logo controls. With a closed CM work verify `/work/{id}/print` contains the organization header, three sections, and both signature blocks.

- [ ] **Step 3: Visual verification**

Check the completion document at desktop preview, 390 px narrow preview, and browser print preview. Confirm the logo stays left, text wraps without overlap, signatures remain aligned, and the print output uses A4 portrait without navigation or gear background.

- [ ] **Step 4: Production checkpoint**

Do not apply `20260620_organization_profile.sql` or create the Supabase organization-logo bucket until Development verification passes and the user explicitly requests Production deployment.
