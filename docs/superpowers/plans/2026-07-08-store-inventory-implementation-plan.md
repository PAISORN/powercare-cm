# Store Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a site-scoped Store / Inventory system for spare parts with QR lookup, receive, stock adjustment, approval-based issue flow, public issue requests, tracking, reports, and LINE events.

**Architecture:** Store data follows the existing multi-tenant hierarchy: Organization -> Site -> Store -> Spare Part -> Stock Movement. All Store records must carry `organizationId` and `plantId`; all actions must reuse existing permission helpers and scope rules instead of creating a parallel authorization system.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Prisma, PostgreSQL/Supabase, Vitest, Playwright, Tailwind CSS, lucide-react, qrcode.

---

## Scope

This plan covers the Store system in four implementation phases:

1. Foundation: role, permissions, schema, master data, spare parts, QR labels, stock summary.
2. Receive / Adjustment: receiving stock, reasoned stock correction, stock movement history.
3. Issue Flow: CM-referenced issue, direct issue, public issue, approval flow, partial issue, store tracking, My Activities.
4. Reports / LINE: Store reports, low-stock visibility, and Store notification events through existing LINE Settings.

## Existing Context To Preserve

- `RoleName.ADMIN` remains the internal value for Owner Admin.
- Site means `Plant` in the current database model.
- Store data must never leak across Organization or Site boundaries.
- Public requester can submit a Store issue only through a Site-specific link or QR and only when Owner Admin enables it for that Site.
- Public requester cannot use My Activities; public status lookup uses Store Tracking and the issue number.
- Engineer approves issue requests before Store Officer can issue stock.
- Stock is reduced only when Store Officer issues stock.

## File Structure

### Domain and permission files

- Modify: `modules/cm-work/cm-work-types.ts`
  - Add `RoleName.STORE_OFFICER`.
  - Add Store issue status constants.
- Modify: `modules/auth/site-admin-permissions.ts`
  - Add Store permission keys.
  - Add Store Officer base permissions.
  - Add Site Admin configurable Store permissions.
- Create: `modules/store/store-types.ts`
  - Store domain constants, input types, status labels, issue type labels.
- Create: `modules/store/store-scope.ts`
  - Resolve Organization/Site/Store scope for logged-in and public flows.
- Create: `modules/store/store-permissions.ts`
  - Store-specific authorization helpers.

### Prisma and migrations

- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.supabase.prisma`
- Create migration: `prisma/migrations/<timestamp>_store_inventory/migration.sql`
- Create Supabase migration: `prisma/supabase-migrations/<date>_store_inventory.sql`

### Store modules

- Create: `modules/store/spare-part-code.ts`
- Create: `modules/store/spare-part-service.ts`
- Create: `modules/store/store-master-service.ts`
- Create: `modules/store/stock-service.ts`
- Create: `modules/store/receive-service.ts`
- Create: `modules/store/adjustment-service.ts`
- Create: `modules/store/issue-service.ts`
- Create: `modules/store/store-report-service.ts`
- Create: `modules/store/store-notification-service.ts`

### Pages

- Modify: `components/app-nav-links.tsx`
- Create: `app/inventory/page.tsx`
- Create: `app/inventory/spare-parts/page.tsx`
- Create: `app/inventory/stock/page.tsx`
- Create: `app/inventory/receive/page.tsx`
- Create: `app/inventory/issue/page.tsx`
- Create: `app/inventory/tracking/page.tsx`
- Create: `app/inventory/reports/page.tsx`
- Create: `app/p/[plantCode]/store/issue/page.tsx`
- Create: `app/store/tracking/page.tsx`
- Modify: `app/activities/page.tsx`
- Modify: `app/admin/line/page.tsx`
- Modify: `app/admin/qr-code/page.tsx`

### Components

- Create: `components/store/spare-part-picker.tsx`
- Create: `components/store/spare-part-qr-scanner.tsx`
- Create: `components/store/issue-line-items.tsx`
- Create: `components/store/store-status-badge.tsx`
- Create: `components/store/store-mobile-action-bar.tsx`
- Create: `components/store/stock-level-pill.tsx`

### Tests

- Create: `modules/store/spare-part-code.test.ts`
- Create: `modules/store/store-permissions.test.ts`
- Create: `modules/store/stock-service.test.ts`
- Create: `modules/store/receive-service.test.ts`
- Create: `modules/store/adjustment-service.test.ts`
- Create: `modules/store/issue-service.test.ts`
- Create: `modules/store/store-report-service.test.ts`
- Modify: `components/app-nav-links.test.tsx`
- Create: `tests/store-public-issue.spec.ts`
- Create: `tests/store-issue-flow.spec.ts`

---

### Task 1: Add Store Role and Permission Vocabulary

**Files:**
- Modify: `modules/cm-work/cm-work-types.ts`
- Modify: `modules/auth/site-admin-permissions.ts`
- Test: `modules/auth/site-admin-permissions.test.ts`
- Test: `components/app-nav-links.test.tsx`

- [ ] **Step 1: Write role and permission tests**

Add tests that prove Store Officer gets Store menus but not CM close/admin controls.

```ts
import { describe, expect, it } from "vitest";
import { PermissionKey, canUsePermission } from "./site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

describe("Store Officer permissions", () => {
  it("allows store work but blocks CM close and admin user management", () => {
    const user = { id: "store-1", role: RoleName.STORE_OFFICER, plantId: "site-a" };

    expect(canUsePermission(user, PermissionKey.VIEW_STORE_STOCK, [])).toBe(true);
    expect(canUsePermission(user, PermissionKey.RECEIVE_STOCK, [])).toBe(true);
    expect(canUsePermission(user, PermissionKey.ISSUE_STOCK, [])).toBe(true);
    expect(canUsePermission(user, PermissionKey.CLOSE_WORK, [])).toBe(false);
    expect(canUsePermission(user, PermissionKey.MANAGE_USERS_PLANT, [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm.cmd run test -- modules/auth/site-admin-permissions.test.ts components/app-nav-links.test.tsx`

Expected: tests fail because `STORE_OFFICER` and Store permission keys do not exist yet.

- [ ] **Step 3: Add role constant**

Update `modules/cm-work/cm-work-types.ts`:

```ts
export const RoleName = {
  ADMIN: "ADMIN",
  ORGANIZATION_ADMIN: "ORGANIZATION_ADMIN",
  SITE_ADMIN: "SITE_ADMIN",
  ENGINEER: "ENGINEER",
  TECHNICIAN: "TECHNICIAN",
  STORE_OFFICER: "STORE_OFFICER",
  VISITOR: "VISITOR",
} as const;
```

- [ ] **Step 4: Add Store permission keys**

Add these keys in `PermissionKey`:

```ts
VIEW_STORE_DASHBOARD: "view_store_dashboard",
MANAGE_STORE: "manage_store",
MANAGE_SPARE_PARTS: "manage_spare_parts",
VIEW_STORE_STOCK: "view_store_stock",
RECEIVE_STOCK: "receive_stock",
ADJUST_STOCK: "adjust_stock",
CREATE_STORE_ISSUE: "create_store_issue",
APPROVE_STORE_ISSUE: "approve_store_issue",
ISSUE_STOCK: "issue_stock",
VIEW_STORE_TRACKING: "view_store_tracking",
VIEW_STORE_REPORTS: "view_store_reports",
ENABLE_PUBLIC_STORE_ISSUE: "enable_public_store_issue",
REQUIRE_PUBLIC_ISSUE_CONTACT: "require_public_issue_contact",
```

- [ ] **Step 5: Add Site Admin configurable Store permissions**

Extend `SITE_ADMIN_CONFIGURABLE_PERMISSIONS`:

```ts
PermissionKey.MANAGE_STORE,
PermissionKey.MANAGE_SPARE_PARTS,
PermissionKey.RECEIVE_STOCK,
PermissionKey.ADJUST_STOCK,
PermissionKey.VIEW_STORE_REPORTS,
PermissionKey.ENABLE_PUBLIC_STORE_ISSUE,
PermissionKey.REQUIRE_PUBLIC_ISSUE_CONTACT,
```

- [ ] **Step 6: Add Store Officer base permissions**

Add `RoleName.STORE_OFFICER` to `alwaysAllowedByRole`:

```ts
[RoleName.STORE_OFFICER]: new Set([
  PermissionKey.LOGIN,
  PermissionKey.VIEW_PROFILE,
  PermissionKey.UPDATE_OWN_PROFILE,
  PermissionKey.VIEW_STORE_DASHBOARD,
  PermissionKey.VIEW_STORE_STOCK,
  PermissionKey.RECEIVE_STOCK,
  PermissionKey.ADJUST_STOCK,
  PermissionKey.CREATE_STORE_ISSUE,
  PermissionKey.ISSUE_STOCK,
  PermissionKey.VIEW_STORE_TRACKING,
  PermissionKey.VIEW_STORE_REPORTS,
]),
```

- [ ] **Step 7: Run tests**

Run: `npm.cmd run test -- modules/auth/site-admin-permissions.test.ts components/app-nav-links.test.tsx`

Expected: PASS.

---

### Task 2: Add Store Database Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.supabase.prisma`
- Create: `modules/store/store-types.ts`
- Test: `modules/store/spare-part-code.test.ts`

- [ ] **Step 1: Add Store domain constants**

Create `modules/store/store-types.ts`:

```ts
export const SparePartIssueStatus = {
  DRAFT: "DRAFT",
  WAITING_ENGINEER_APPROVAL: "WAITING_ENGINEER_APPROVAL",
  RETURNED_FOR_EDIT: "RETURNED_FOR_EDIT",
  ENGINEER_APPROVED: "ENGINEER_APPROVED",
  WAITING_STORE_ISSUE: "WAITING_STORE_ISSUE",
  PARTIALLY_ISSUED: "PARTIALLY_ISSUED",
  ISSUED: "ISSUED",
  REJECTED: "REJECTED",
  NOT_ENOUGH_STOCK: "NOT_ENOUGH_STOCK",
  CANCELED: "CANCELED",
} as const;

export type SparePartIssueStatus = (typeof SparePartIssueStatus)[keyof typeof SparePartIssueStatus];

export const StockMovementType = {
  RECEIVE: "RECEIVE",
  ISSUE: "ISSUE",
  PARTIAL_ISSUE: "PARTIAL_ISSUE",
  ADJUSTMENT_IN: "ADJUSTMENT_IN",
  ADJUSTMENT_OUT: "ADJUSTMENT_OUT",
} as const;

export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];
```

- [ ] **Step 2: Add Prisma models**

Add these models to both Prisma schemas:

```prisma
model StoreCategory {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  plantId        String
  plant          Plant        @relation(fields: [plantId], references: [id], onDelete: Cascade)
  name           String
  active         Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  stores Store[]

  @@unique([plantId, name])
  @@index([organizationId, active])
  @@index([plantId, active])
}

model Store {
  id              String        @id @default(cuid())
  organizationId  String
  organization    Organization  @relation(fields: [organizationId], references: [id])
  plantId         String
  plant           Plant         @relation(fields: [plantId], references: [id], onDelete: Cascade)
  categoryId      String?
  category        StoreCategory? @relation(fields: [categoryId], references: [id])
  name            String
  active          Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  stocks     SparePartStock[]
  movements  StockMovement[]

  @@unique([plantId, name])
  @@index([organizationId, active])
  @@index([plantId, active])
}

model SparePartCategory {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  plantId        String
  plant          Plant        @relation(fields: [plantId], references: [id], onDelete: Cascade)
  name           String
  active         Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  spareParts SparePart[]

  @@unique([plantId, name])
  @@index([organizationId, active])
  @@index([plantId, active])
}

model SparePart {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  plantId        String
  plant          Plant        @relation(fields: [plantId], references: [id], onDelete: Cascade)
  code           String
  itemCode       String?
  name           String
  specification  String?
  unit           String
  categoryId     String?
  category       SparePartCategory? @relation(fields: [categoryId], references: [id])
  storageLocation String?
  minimumStock   Int          @default(0)
  latestUnitPrice Decimal     @default(0)
  imageFileName  String?
  imageMimeType  String?
  imageFileSize  Int?
  imageStoragePath String?
  active         Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  applicableZones SparePartApplicableZone[]
  stocks          SparePartStock[]
  movements       StockMovement[]
  receiveItems    SparePartReceiveItem[]
  issueItems      SparePartIssueItem[]

  @@unique([plantId, code])
  @@index([organizationId, active])
  @@index([plantId, active])
  @@index([plantId, itemCode])
}

model SparePartApplicableZone {
  id          String    @id @default(cuid())
  sparePartId String
  sparePart   SparePart @relation(fields: [sparePartId], references: [id], onDelete: Cascade)
  zoneId      String
  zone        Zone      @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  @@unique([sparePartId, zoneId])
  @@index([zoneId])
}

model SparePartStock {
  id          String    @id @default(cuid())
  organizationId String
  plantId     String
  storeId     String
  store       Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  sparePartId String
  sparePart   SparePart @relation(fields: [sparePartId], references: [id], onDelete: Cascade)
  quantity    Int       @default(0)
  updatedAt   DateTime  @updatedAt

  @@unique([storeId, sparePartId])
  @@index([organizationId, plantId])
  @@index([sparePartId])
}
```

- [ ] **Step 3: Add receive, issue, and movement models**

Add:

```prisma
model SparePartSequence {
  id        String  @id @default(cuid())
  plantId   String  @unique
  plant     Plant   @relation(fields: [plantId], references: [id], onDelete: Cascade)
  nextNumber Int    @default(1)
  updatedAt DateTime @updatedAt
}

model SparePartIssueNumberSequence {
  id        String  @id @default(cuid())
  plantId   String
  year      Int
  month     Int
  nextNumber Int    @default(1)
  updatedAt DateTime @updatedAt

  @@unique([plantId, year, month])
}

model StockMovement {
  id             String   @id @default(cuid())
  organizationId String
  plantId        String
  storeId        String
  store          Store    @relation(fields: [storeId], references: [id])
  sparePartId    String
  sparePart      SparePart @relation(fields: [sparePartId], references: [id])
  type           String
  quantity       Int
  unitPrice      Decimal  @default(0)
  referenceType  String?
  referenceId    String?
  reason         String?
  actorId        String?
  actor          User?    @relation(fields: [actorId], references: [id])
  createdAt      DateTime @default(now())

  @@index([organizationId, plantId, createdAt])
  @@index([storeId, sparePartId, createdAt])
  @@index([referenceType, referenceId])
}

model SparePartReceive {
  id             String   @id @default(cuid())
  organizationId String
  plantId        String
  documentNumber String?
  supplierName   String?
  receivedAt     DateTime
  note           String?
  receiverId     String
  receiver       User     @relation(fields: [receiverId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  items SparePartReceiveItem[]

  @@index([organizationId, plantId, receivedAt])
}

model SparePartReceiveItem {
  id          String   @id @default(cuid())
  receiveId   String
  receive     SparePartReceive @relation(fields: [receiveId], references: [id], onDelete: Cascade)
  storeId     String
  sparePartId String
  sparePart   SparePart @relation(fields: [sparePartId], references: [id])
  quantity    Int
  unitPrice   Decimal   @default(0)
}

model SparePartIssue {
  id             String   @id @default(cuid())
  number         String   @unique
  organizationId String
  plantId        String
  cmWorkId       String?
  cmWork         CmWork?  @relation(fields: [cmWorkId], references: [id])
  issueMode      String
  issueType      String?
  reason         String?
  requesterName  String
  requesterDepartment String?
  requesterContact String?
  requesterUserId String?
  requesterUser   User?   @relation("StoreIssueRequester", fields: [requesterUserId], references: [id])
  status          String
  engineerId      String?
  engineer        User?   @relation("StoreIssueEngineer", fields: [engineerId], references: [id])
  storeOfficerId  String?
  storeOfficer    User?   @relation("StoreIssueOfficer", fields: [storeOfficerId], references: [id])
  engineerNote    String?
  storeNote       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  engineerApprovedAt DateTime?
  issuedAt        DateTime?
  canceledAt      DateTime?

  items SparePartIssueItem[]

  @@index([organizationId, plantId, status, createdAt])
  @@index([cmWorkId])
}

model SparePartIssueItem {
  id          String   @id @default(cuid())
  issueId     String
  issue       SparePartIssue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  storeId     String
  sparePartId String
  sparePart   SparePart @relation(fields: [sparePartId], references: [id])
  requestedQuantity Int
  issuedQuantity    Int @default(0)
  unitPrice         Decimal @default(0)

  @@index([storeId, sparePartId])
}
```

- [ ] **Step 4: Add relation fields**

Add relation arrays to existing `Organization`, `Plant`, `Zone`, `CmWork`, and `User` models so Prisma generates correctly.

- [ ] **Step 5: Generate Prisma client**

Run: `npm.cmd run db:generate`

Expected: Prisma client generated successfully.

- [ ] **Step 6: Run build for type safety**

Run: `npm.cmd run build`

Expected: build passes after relation names are corrected.

---

### Task 3: Spare Part Code and Store Master Services

**Files:**
- Create: `modules/store/spare-part-code.ts`
- Create: `modules/store/store-master-service.ts`
- Create: `modules/store/spare-part-service.ts`
- Test: `modules/store/spare-part-code.test.ts`

- [ ] **Step 1: Test spare part code generation**

Create `modules/store/spare-part-code.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatSparePartCode, parseSparePartCode } from "./spare-part-code";

describe("spare part code", () => {
  it("formats codes with site code and five-digit sequence", () => {
    expect(formatSparePartCode("rtb", 1)).toBe("SP-RTB-00001");
    expect(formatSparePartCode("PTT", 42)).toBe("SP-PTT-00042");
  });

  it("parses valid spare part codes", () => {
    expect(parseSparePartCode("SP-RTB-00001")).toEqual({ siteCode: "RTB", sequence: 1 });
  });
});
```

- [ ] **Step 2: Implement spare part code helper**

Create `modules/store/spare-part-code.ts`:

```ts
const SPARE_PART_CODE_PATTERN = /^SP-([A-Z0-9]{3})-(\d{5})$/;

export function formatSparePartCode(siteCode: string, sequence: number) {
  const normalizedSiteCode = siteCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(normalizedSiteCode)) throw new Error("Site code must be exactly 3 letters or numbers");
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Sequence must be a positive integer");
  return `SP-${normalizedSiteCode}-${String(sequence).padStart(5, "0")}`;
}

export function parseSparePartCode(code: string) {
  const match = code.trim().toUpperCase().match(SPARE_PART_CODE_PATTERN);
  if (!match) return null;
  return { siteCode: match[1], sequence: Number(match[2]) };
}
```

- [ ] **Step 3: Run helper tests**

Run: `npm.cmd run test -- modules/store/spare-part-code.test.ts`

Expected: PASS.

- [ ] **Step 4: Implement Store master service**

Create `modules/store/store-master-service.ts` with functions:

```ts
export async function listStoresForPlant(plantId: string) {}
export async function createStoreCategory(actor: Actor, input: { plantId: string; name: string }) {}
export async function createStore(actor: Actor, input: { plantId: string; categoryId?: string; name: string }) {}
export async function createSparePartCategory(actor: Actor, input: { plantId: string; name: string }) {}
```

Each function must:

- Resolve plant and organization.
- Verify actor scope.
- Verify permission.
- Write audit event.
- Reject duplicate names inside the same Site with a user-friendly error.

- [ ] **Step 5: Implement spare part service**

Create `modules/store/spare-part-service.ts` with functions:

```ts
export async function createSparePart(actor: Actor, input: CreateSparePartInput) {}
export async function updateSparePart(actor: Actor, sparePartId: string, input: UpdateSparePartInput) {}
export async function listSpareParts(actor: Actor, filter: { plantId?: string; search?: string }) {}
export async function getSparePartByCode(actor: Actor, plantId: string, code: string) {}
```

The service must:

- Generate `SP-{SITE_CODE}-00001` from `SparePartSequence`.
- Save `itemCode`, `latestUnitPrice`, `minimumStock`, and applicable zones.
- Reject code lookup when the code belongs to another Site.

---

### Task 4: Inventory Navigation and Foundation Pages

**Files:**
- Modify: `components/app-nav-links.tsx`
- Modify: `components/app-nav-links.test.tsx`
- Create: `app/inventory/page.tsx`
- Create: `app/inventory/spare-parts/page.tsx`
- Create: `app/inventory/stock/page.tsx`
- Create: `components/store/stock-level-pill.tsx`

- [ ] **Step 1: Write navigation tests**

Update `components/app-nav-links.test.tsx` to expect Store Officer sees Inventory links as active links:

```ts
expect(getAppLinks(RoleName.STORE_OFFICER).some((link) => link.href === "/inventory/spare-parts")).toBe(true);
expect(getAppLinks(RoleName.STORE_OFFICER).some((link) => link.href === "/inventory/stock")).toBe(true);
expect(getAppLinks(RoleName.STORE_OFFICER).some((link) => link.href === "/inventory/receive")).toBe(true);
expect(getAppLinks(RoleName.STORE_OFFICER).some((link) => link.href === "/inventory/issue")).toBe(true);
```

- [ ] **Step 2: Replace disabled Inventory placeholders**

Change Inventory links from `href: "#", disabled: true` to real routes:

```ts
{ label: "Spare Parts", href: "/inventory/spare-parts", icon: Package, nested: true, parentSectionId: "inventory" },
{ label: "Stock", href: "/inventory/stock", icon: Boxes, nested: true, parentSectionId: "inventory" },
{ label: "Issue", href: "/inventory/issue", icon: ArrowUpFromLine, nested: true, parentSectionId: "inventory" },
{ label: "Receive", href: "/inventory/receive", icon: ArrowDownToLine, nested: true, parentSectionId: "inventory" },
{ label: "Store Tracking", href: "/inventory/tracking", icon: Search, nested: true, parentSectionId: "inventory" },
```

- [ ] **Step 3: Create Spare Parts page**

Create `app/inventory/spare-parts/page.tsx` as a server page that:

- Requires login.
- Checks `MANAGE_SPARE_PARTS` or `VIEW_STORE_STOCK`.
- Shows a mobile-friendly card list.
- Has a create/edit drawer in a follow-up task if drawer infrastructure is already reusable.

- [ ] **Step 4: Create Stock page**

Create `app/inventory/stock/page.tsx` that:

- Shows spare part, store, available quantity, minimum stock, latest unit price, and low stock marker.
- Supports filter by Store Category, Store, Spare Part Category, Applicable Zone.

- [ ] **Step 5: Run page build**

Run: `npm.cmd run build`

Expected: routes compile.

---

### Task 5: Spare Part QR Labels and Scanner

**Files:**
- Create: `app/inventory/spare-parts/[id]/qr.svg/route.ts`
- Create: `components/store/spare-part-qr-scanner.tsx`
- Modify: `app/admin/qr-code/page.tsx`
- Test: `tests/store-public-issue.spec.ts`

- [ ] **Step 1: Add QR SVG route**

Create a route that renders QR for `SparePart.code`, not database ID.

```ts
import QRCode from "qrcode";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sparePart = await db.sparePart.findUnique({ where: { id } });
  if (!sparePart) return new NextResponse("Not found", { status: 404 });
  const svg = await QRCode.toString(sparePart.code, { type: "svg", margin: 1, width: 320 });
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
}
```

- [ ] **Step 2: Add camera scanner component**

Create `components/store/spare-part-qr-scanner.tsx` with:

- A camera button.
- `navigator.mediaDevices.getUserMedia`.
- A fallback manual input for browsers that block camera.
- A callback `onScan(code: string)`.

- [ ] **Step 3: Add Site Store Issue QR to QR admin page**

Add a Store section that produces:

```text
/p/{plantCode}/store/issue
```

Only show it when `ENABLE_PUBLIC_STORE_ISSUE` is enabled or actor is Owner Admin.

---

### Task 6: Receive Stock

**Files:**
- Create: `modules/store/receive-service.ts`
- Create: `app/inventory/receive/page.tsx`
- Test: `modules/store/receive-service.test.ts`

- [ ] **Step 1: Write receive service tests**

Cover:

- Store Officer can receive stock inside own Site.
- Receive creates stock movement.
- Receive updates stock quantity.
- Receive updates latest unit price on spare part.
- Cross-Site receive is rejected.

- [ ] **Step 2: Implement receive transaction**

Service behavior:

```ts
await db.$transaction(async (tx) => {
  const receive = await tx.sparePartReceive.create({ data: receiveData });
  for (const item of input.items) {
    await tx.sparePartReceiveItem.create({ data: itemData });
    await tx.sparePartStock.upsert({
      where: { storeId_sparePartId: { storeId: item.storeId, sparePartId: item.sparePartId } },
      update: { quantity: { increment: item.quantity } },
      create: { organizationId, plantId, storeId: item.storeId, sparePartId: item.sparePartId, quantity: item.quantity },
    });
    await tx.stockMovement.create({ data: { type: StockMovementType.RECEIVE, quantity: item.quantity, unitPrice: item.unitPrice } });
    await tx.sparePart.update({ where: { id: item.sparePartId }, data: { latestUnitPrice: item.unitPrice } });
  }
});
```

- [ ] **Step 3: Build mobile-friendly receive page**

The page must support:

- Header fields: receive date, document number, supplier, note.
- Multiple line items.
- QR scan or manual part search.
- Store selection.
- Quantity and unit price.

---

### Task 7: Stock Adjustment

**Files:**
- Create: `modules/store/adjustment-service.ts`
- Add section to: `app/inventory/stock/page.tsx`
- Test: `modules/store/adjustment-service.test.ts`

- [ ] **Step 1: Write adjustment tests**

Cover:

- Store Officer can adjust stock with reason.
- Site Admin needs `manage_stock_adjustment`.
- Engineer and Technician cannot adjust stock.
- Adjustment cannot make stock negative.
- Adjustment creates stock movement.

- [ ] **Step 2: Implement adjustment service**

Adjustment input:

```ts
type StockAdjustmentInput = {
  plantId: string;
  storeId: string;
  sparePartId: string;
  quantityDelta: number;
  reason: string;
};
```

Reject empty reason and negative final stock.

---

### Task 8: Store Issue Flow

**Files:**
- Create: `modules/store/issue-service.ts`
- Create: `app/inventory/issue/page.tsx`
- Create: `app/p/[plantCode]/store/issue/page.tsx`
- Create: `components/store/issue-line-items.tsx`
- Test: `modules/store/issue-service.test.ts`

- [ ] **Step 1: Write issue service tests**

Cover:

- Logged-in Technician creates CM-referenced issue.
- Public requester creates public issue only when Site setting is enabled.
- CM search only returns CM work inside current Site.
- Request quantity cannot exceed available stock at submission.
- Engineer approves and status moves to `WAITING_STORE_ISSUE`.
- Store Officer issues full stock and status moves to `ISSUED`.
- Store Officer issues partial stock and status moves to `PARTIALLY_ISSUED`.
- Store Officer marks `NOT_ENOUGH_STOCK`.

- [ ] **Step 2: Implement issue number generation**

Use Bangkok date and Site code:

```ts
SI-RTB-2026-07-0001
```

Store sequence by `plantId + year + month`.

- [ ] **Step 3: Implement create issue**

Creation rules:

- `CM_REFERENCED`: requires CM work number in same Site.
- `DIRECT`: requires issue type and reason.
- Public request requires Site public issue enabled.
- Multiple line items are allowed.
- Each line item checks available stock before submission.
- Initial status is `WAITING_ENGINEER_APPROVAL`.

- [ ] **Step 4: Implement Engineer approval**

Engineer can:

- Approve.
- Reject with note.
- Return for edit with note.

Approval sets:

```ts
status: SparePartIssueStatus.WAITING_STORE_ISSUE
engineerId: actor.id
engineerApprovedAt: new Date()
```

- [ ] **Step 5: Implement Store Officer issue**

Store Officer can:

- Issue full quantity.
- Issue partial quantity.
- Mark not enough stock.

Stock decreases only here. Every decrease creates `StockMovement`.

- [ ] **Step 6: Build mobile-first issue pages**

Both logged-in and public pages must use large inputs, scan button, sticky submit bar, and clear issue number success state.

---

### Task 9: My Activities and Store Tracking

**Files:**
- Modify: `app/activities/page.tsx`
- Create: `app/inventory/tracking/page.tsx`
- Create: `app/store/tracking/page.tsx`
- Create: `modules/store/store-tracking-service.ts`
- Test: `tests/store-issue-flow.spec.ts`

- [ ] **Step 1: Add Store activity queries**

My Activities must show:

- Engineer: `WAITING_ENGINEER_APPROVAL`.
- Store Officer: `WAITING_STORE_ISSUE`.
- Requester user: `RETURNED_FOR_EDIT`, `PARTIALLY_ISSUED`, `NOT_ENOUGH_STOCK`.

- [ ] **Step 2: Add Store Tracking public lookup**

Lookup by `Spare Part Issue Number` and show:

- Status.
- Requested items.
- Issued quantity.
- Store note / engineer note when safe to show.
- No internal user controls.

---

### Task 10: Store Reports and LINE Events

**Files:**
- Create: `modules/store/store-report-service.ts`
- Modify: `app/inventory/reports/page.tsx`
- Modify: `app/admin/line/page.tsx`
- Modify: existing LINE delivery service files in `modules/line`
- Test: `modules/store/store-report-service.test.ts`

- [ ] **Step 1: Implement report service**

Reports:

- Stock balance.
- Low stock.
- Receive by date range.
- Issue by date range.
- Issue by CM Work / Direct issue.

- [ ] **Step 2: Add Store LINE events**

Events:

- Store issue created.
- Engineer approved issue.
- Store Officer issued stock.
- Not enough stock.
- Low stock.

Use existing LINE destination and event settings. Do not create a second LINE settings system.

---

### Task 11: Documentation and Verification

**Files:**
- Modify: `docs/Permission.md`
- Modify: `CONTEXT.md`
- Create: `docs/Store-Inventory-Manual-TH.md`
- Create: `docs/Store-Inventory-Test-Checklist-TH.md`

- [ ] **Step 1: Write user manual**

Cover:

- Store Officer receive.
- Store Officer issue.
- Technician/Engineer request.
- Public request through QR.
- Tracking issue status.

- [ ] **Step 2: Write test checklist**

Checklist must include:

- Owner Admin enables public issue per Site.
- Public issue request with contact required.
- CM-referenced issue rejects CM number from another Site.
- Engineer approval appears in My Activities.
- Store Officer partial issue updates stock correctly.
- Store Tracking shows issued quantity.

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm.cmd run test
npm.cmd run build
```

Expected: all tests and build pass.

---

## Commit Strategy

Recommended commit checkpoints:

1. `feat(store): add role permissions and schema foundation`
2. `feat(store): add spare part and stock master data`
3. `feat(store): add receive and stock adjustment`
4. `feat(store): add issue approval flow`
5. `feat(store): add tracking reports and line events`
6. `docs(store): add store user guide and test checklist`

Do not deploy to Production until:

- Local schema migration is verified.
- Supabase development database migration is verified.
- Owner Admin, Organization Admin, Site Admin, Store Officer, Engineer, Technician flows pass.
- Public issue QR flow passes on mobile.

## Self-Review

- Spec coverage: Role, public issue, QR, Site scope, Store Officer, Engineer approval, partial issue, not enough stock, issue number, reports, and LINE events are covered.
- Placeholder scan: no unresolved placeholder terms are used.
- Type consistency: status names and permission names are defined before later tasks reference them.
