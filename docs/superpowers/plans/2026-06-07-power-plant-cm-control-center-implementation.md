# Power Plant CM Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working release of Power Plant CM Control Center: public repair request, public tracking, role dashboards, CM workflow, completion document printing, admin back office, audit trail, and Excel export.

**Architecture:** Use a Modular Monolith with domain-focused modules. Keep CM workflow, permission, SLA, audit, dashboard queries, document rendering, and file storage as separate units behind clear interfaces so the app can grow without turning into one tangled page.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Prisma ORM, SQLite for local MVP data, Zod validation, bcryptjs password hashing, cookie-backed sessions, Vitest for unit/domain tests, Playwright for browser flow tests, and xlsx for Excel export.

---

## Reference Documents

- `CONTEXT.md`
- `Architecture.md`
- `docs/superpowers/specs/2026-06-07-power-plant-cm-control-center-design.md`
- `mockups/cm-landing-day-night.html`

## Scope

This plan builds the complete MVP in one modular application. The plan is split into testable milestones so each stage produces working software:

1. Project foundation.
2. Data model and seed data.
3. Domain rules: roles, permissions, statuses, SLA.
4. Public pages and repair request flow.
5. Login, profile, and signature storage.
6. Authenticated dashboards and work list.
7. CM work actions and engineer review.
8. Admin back office.
9. Completion document print view.
10. Dashboard query model and Excel export.
11. Audit trail and end-to-end verification.

## Target File Structure

All paths are relative to `F:\Sol Project\Test CM03`.

```text
app/
  layout.tsx
  page.tsx
  globals.css
  login/page.tsx
  request/page.tsx
  request/success/[number]/page.tsx
  tracking/page.tsx
  dashboard/page.tsx
  work/page.tsx
  work/[id]/page.tsx
  work/[id]/print/page.tsx
  admin/users/page.tsx
  admin/categories/page.tsx
  admin/zones/page.tsx
  admin/sla/page.tsx
  admin/audit/page.tsx
  profile/page.tsx
  reports/page.tsx

components/
  app-shell.tsx
  public-header.tsx
  theme-toggle.tsx
  status-badge.tsx
  filter-bar.tsx
  work-summary-cards.tsx
  cm-calendar.tsx
  signature-preview.tsx

lib/
  db.ts
  session.ts
  password.ts
  validation.ts
  time.ts
  file-storage.ts
  excel.ts

modules/
  audit/
    audit-service.ts
    audit-types.ts
  auth/
    auth-service.ts
    permission.ts
    permission.test.ts
  cm-work/
    cm-work-types.ts
    cm-work-service.ts
    cm-work-number.ts
    cm-work-number.test.ts
    cm-work-state-machine.ts
    cm-work-state-machine.test.ts
  dashboard/
    dashboard-query.ts
    dashboard-query.test.ts
  documents/
    completion-document.ts
    completion-document.test.ts
  master-data/
    seed-data.ts
  sla/
    sla-service.ts
    sla-service.test.ts

prisma/
  schema.prisma
  seed.ts

tests/
  e2e/
    public-request.spec.ts
    technician-workflow.spec.ts
    engineer-review.spec.ts
    admin-backoffice.spec.ts
```

## Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Initialize git and project metadata**

Run:

```powershell
git init
npm init -y
```

Expected:

```text
Initialized empty Git repository
```

- [ ] **Step 2: Install runtime and dev dependencies**

Run:

```powershell
npm install next react react-dom @prisma/client zod bcryptjs xlsx date-fns date-fns-tz lucide-react
npm install -D typescript @types/node @types/react @types/react-dom prisma tailwindcss postcss autoprefixer vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom playwright
```

Expected:

```text
added ... packages
```

- [ ] **Step 3: Create `package.json` scripts**

Use this script section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Also install `tsx`:

```powershell
npm install -D tsx
```

- [ ] **Step 4: Configure environment**

Create `.env.example`:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-this-local-secret"
SIGNATURE_STORAGE_DIR="./storage/signatures"
```

Create `.gitignore`:

```gitignore
node_modules/
.next/
dist/
coverage/
.env
prisma/dev.db
prisma/dev.db-journal
storage/
.superpowers/
```

- [ ] **Step 5: Create minimal app shell**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Plant CM Control Center",
  description: "ระบบแจ้งซ่อมและติดตามงาน Corrective Maintenance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
```

Create `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #eef4fa;
  --surface: #ffffff;
  --ink: #102033;
  --muted: #5b6f86;
  --line: #dce7f2;
  --primary: #1463ff;
}

[data-theme="night"] {
  --bg: #07111d;
  --surface: #0d2132;
  --ink: #f8fbff;
  --muted: #9db7ca;
  --line: #1b3b52;
  --primary: #14b8a6;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: "Segoe UI", "Noto Sans Thai", Arial, sans-serif;
}
```

- [ ] **Step 6: Verify foundation**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 7: Commit foundation**

Run:

```powershell
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs tailwind.config.ts vitest.config.ts playwright.config.ts app .gitignore .env.example
git commit -m "chore: initialize cm control center app"
```

## Task 2: Data Model And Seed Data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/db.ts`
- Create: `modules/master-data/seed-data.ts`

- [ ] **Step 1: Define Prisma schema**

Create `prisma/schema.prisma` with these models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum RoleName {
  ADMIN
  ENGINEER
  TECHNICIAN
}

enum WorkStatus {
  NEW
  WAITING_TO_CLAIM
  CLAIMED
  IN_PROGRESS
  WAITING_TO_CLOSE
  RETURNED_FOR_CORRECTION
  CLOSED
  CANCELED
}

enum Urgency {
  NORMAL
  URGENT
  CRITICAL
}

model User {
  id           String    @id @default(cuid())
  username     String    @unique
  passwordHash String
  fullName     String
  department   String?
  role         RoleName
  categoryId   String?
  category     Category? @relation(fields: [categoryId], references: [id])
  signature    Signature?
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  claimedWorks CmWork[]  @relation("Claimant")
  closedWorks  CmWork[]  @relation("EngineerReviewer")
  auditEvents  AuditEvent[]
}

model Signature {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  fileName    String
  mimeType    String
  fileSize    Int
  storagePath String
  uploadedAt  DateTime @default(now())
}

model Category {
  id        String   @id @default(cuid())
  name      String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  works     CmWork[]
}

model Zone {
  id        String   @id @default(cuid())
  name      String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  works     CmWork[]
}

model CmWork {
  id                   String       @id @default(cuid())
  number               String       @unique
  requesterName        String
  requesterDepartment  String
  categoryId           String
  category             Category     @relation(fields: [categoryId], references: [id])
  zoneId               String
  zone                 Zone         @relation(fields: [zoneId], references: [id])
  machineName          String
  problemTitle         String
  problemDetail        String
  urgency              Urgency
  status               WorkStatus   @default(NEW)
  claimantId           String?
  claimant             User?        @relation("Claimant", fields: [claimantId], references: [id])
  rootCause            String?
  correctiveAction     String?
  workNote             String?
  engineerNote         String?
  canceledReason       String?
  releaseReason        String?
  returnedReason       String?
  createdAt            DateTime     @default(now())
  claimedAt            DateTime?
  inProgressAt         DateTime?
  waitingToCloseAt     DateTime?
  closedAt             DateTime?
  canceledAt           DateTime?
  reviewerId           String?
  reviewer             User?        @relation("EngineerReviewer", fields: [reviewerId], references: [id])
  statusHistory        StatusHistory[]
  auditEvents          AuditEvent[]
}

model StatusHistory {
  id         String     @id @default(cuid())
  cmWorkId   String
  cmWork     CmWork     @relation(fields: [cmWorkId], references: [id])
  fromStatus WorkStatus?
  toStatus   WorkStatus
  changedById String?
  changedAt  DateTime   @default(now())
  note       String?
}

model AuditEvent {
  id          String   @id @default(cuid())
  cmWorkId    String?
  cmWork      CmWork?  @relation(fields: [cmWorkId], references: [id])
  actorId     String?
  actor       User?    @relation(fields: [actorId], references: [id])
  entityType  String
  entityId    String
  action      String
  beforeJson  String?
  afterJson   String?
  reason      String?
  createdAt   DateTime @default(now())
}

model SlaSetting {
  id             String   @id @default(cuid())
  claimDays      Int      @default(1)
  executionDays  Int      @default(3)
  reviewDays     Int      @default(2)
  updatedAt      DateTime @updatedAt
}
```

- [ ] **Step 2: Create database client**

Create `lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 3: Create seed data constants**

Create `modules/master-data/seed-data.ts`:

```ts
export const initialCategories = ["งานไฟฟ้า", "งานเครื่องกล"] as const;

export const initialZones = [
  "Fuel preparation",
  "Fuel Warehouse",
  "Boiler&Combustion",
  "Turbine",
  "ESP",
  "Water Treatment Plant",
  "Cooling Tower",
  "Vehicle",
  "Office",
  "Other",
] as const;

export const defaultSla = {
  claimDays: 1,
  executionDays: 3,
  reviewDays: 2,
} as const;
```

- [ ] **Step 4: Create seed script**

Create `prisma/seed.ts`:

```ts
import bcrypt from "bcryptjs";
import { RoleName } from "@prisma/client";
import { db } from "../lib/db";
import { defaultSla, initialCategories, initialZones } from "../modules/master-data/seed-data";

async function main() {
  for (const name of initialCategories) {
    await db.category.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  for (const name of initialZones) {
    await db.zone.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  const existingSla = await db.slaSetting.findFirst();
  if (!existingSla) {
    await db.slaSetting.create({ data: defaultSla });
  }

  const passwordHash = await bcrypt.hash("admin1234", 12);
  await db.user.upsert({
    where: { username: "admin" },
    update: { active: true, role: RoleName.ADMIN },
    create: {
      username: "admin",
      passwordHash,
      fullName: "System Admin",
      department: "Maintenance",
      role: RoleName.ADMIN,
      active: true,
    },
  });
}

main()
  .then(async () => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 5: Run migration and seed**

Run:

```powershell
npm run db:migrate -- --name init_cm_control_center
npm run db:seed
```

Expected:

```text
The following migration(s) have been created and applied
```

Seeded admin login:

```text
username: admin
password: admin1234
```

- [ ] **Step 6: Commit data model**

Run:

```powershell
git add prisma lib/db.ts modules/master-data
git commit -m "feat: add cm data model and seed data"
```

## Task 3: Domain Rules, Permissions, And Status Machine

**Files:**
- Create: `modules/cm-work/cm-work-types.ts`
- Create: `modules/cm-work/cm-work-number.ts`
- Create: `modules/cm-work/cm-work-number.test.ts`
- Create: `modules/auth/permission.ts`
- Create: `modules/auth/permission.test.ts`
- Create: `modules/cm-work/cm-work-state-machine.ts`
- Create: `modules/cm-work/cm-work-state-machine.test.ts`
- Create: `modules/sla/sla-service.ts`
- Create: `modules/sla/sla-service.test.ts`

- [ ] **Step 1: Define shared CM domain types**

Create `modules/cm-work/cm-work-types.ts`:

```ts
import { RoleName, Urgency, WorkStatus } from "@prisma/client";

export type Actor = {
  id: string;
  role: RoleName;
  categoryId: string | null;
};

export type WorkAccessContext = {
  status: WorkStatus;
  categoryId: string;
  claimantId: string | null;
};

export const urgencyLabels: Record<Urgency, string> = {
  NORMAL: "ปกติ",
  URGENT: "เร่งด่วน",
  CRITICAL: "วิกฤต",
};

export const statusLabels: Record<WorkStatus, string> = {
  NEW: "แจ้งใหม่",
  WAITING_TO_CLAIM: "รอรับงาน",
  CLAIMED: "รับเรื่องแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  WAITING_TO_CLOSE: "รอปิดงาน",
  RETURNED_FOR_CORRECTION: "ส่งกลับให้แก้ไข",
  CLOSED: "ปิดงานแล้ว",
  CANCELED: "ยกเลิก",
};
```

- [ ] **Step 2: Write CM number tests**

Create `modules/cm-work/cm-work-number.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCmWorkNumber } from "./cm-work-number";

describe("formatCmWorkNumber", () => {
  it("formats year, month, and monthly sequence", () => {
    expect(formatCmWorkNumber(new Date("2026-06-07T01:00:00Z"), 1)).toBe("CM-2026-06-0001");
    expect(formatCmWorkNumber(new Date("2026-12-01T01:00:00Z"), 42)).toBe("CM-2026-12-0042");
  });
});
```

- [ ] **Step 3: Implement CM number formatting**

Create `modules/cm-work/cm-work-number.ts`:

```ts
export function formatCmWorkNumber(date: Date, monthlySequence: number) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const sequence = String(monthlySequence).padStart(4, "0");
  return `CM-${year}-${month}-${sequence}`;
}
```

- [ ] **Step 4: Write permission tests**

Create `modules/auth/permission.test.ts`:

```ts
import { RoleName, WorkStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canCancelWork, canClaimWork, canCloseWork, canPrintCompletionDocument } from "./permission";

const electrical = "cat-electrical";
const mechanical = "cat-mechanical";

describe("category permissions", () => {
  it("lets admin act across categories", () => {
    const admin = { id: "admin", role: RoleName.ADMIN, categoryId: null };
    expect(canClaimWork(admin, { status: WorkStatus.NEW, categoryId: electrical, claimantId: null })).toBe(true);
    expect(canCancelWork(admin, { status: WorkStatus.IN_PROGRESS, categoryId: mechanical, claimantId: "tech" })).toBe(true);
  });

  it("lets engineer act only in own category", () => {
    const engineer = { id: "eng", role: RoleName.ENGINEER, categoryId: electrical };
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: electrical, claimantId: "tech" })).toBe(true);
    expect(canCloseWork(engineer, { status: WorkStatus.WAITING_TO_CLOSE, categoryId: mechanical, claimantId: "tech" })).toBe(false);
  });

  it("lets technician claim only own category and never cancel", () => {
    const tech = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical };
    expect(canClaimWork(tech, { status: WorkStatus.NEW, categoryId: electrical, claimantId: null })).toBe(true);
    expect(canClaimWork(tech, { status: WorkStatus.NEW, categoryId: mechanical, claimantId: null })).toBe(false);
    expect(canCancelWork(tech, { status: WorkStatus.IN_PROGRESS, categoryId: electrical, claimantId: "tech" })).toBe(false);
  });

  it("lets every logged-in role print closed work", () => {
    const tech = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical };
    expect(canPrintCompletionDocument(tech, { status: WorkStatus.CLOSED, categoryId: mechanical, claimantId: "other" })).toBe(true);
    expect(canPrintCompletionDocument(tech, { status: WorkStatus.CANCELED, categoryId: mechanical, claimantId: "other" })).toBe(false);
  });
});
```

- [ ] **Step 5: Implement permissions**

Create `modules/auth/permission.ts`:

```ts
import { RoleName, WorkStatus } from "@prisma/client";
import type { Actor, WorkAccessContext } from "../cm-work/cm-work-types";

function sameCategory(actor: Actor, work: WorkAccessContext) {
  return actor.categoryId === work.categoryId;
}

function isClaimableStatus(status: WorkStatus) {
  return status === WorkStatus.NEW || status === WorkStatus.WAITING_TO_CLAIM || status === WorkStatus.RETURNED_FOR_CORRECTION;
}

export function canClaimWork(actor: Actor, work: WorkAccessContext) {
  if (work.claimantId) return false;
  if (!isClaimableStatus(work.status)) return false;
  if (actor.role === RoleName.ADMIN) return true;
  if (actor.role === RoleName.ENGINEER || actor.role === RoleName.TECHNICIAN) return sameCategory(actor, work);
  return false;
}

export function canCancelWork(actor: Actor, work: WorkAccessContext) {
  if (work.status === WorkStatus.CLOSED || work.status === WorkStatus.CANCELED) return false;
  if (actor.role === RoleName.ADMIN) return true;
  return actor.role === RoleName.ENGINEER && sameCategory(actor, work);
}

export function canCloseWork(actor: Actor, work: WorkAccessContext) {
  if (work.status !== WorkStatus.WAITING_TO_CLOSE) return false;
  if (actor.role === RoleName.ADMIN) return true;
  return actor.role === RoleName.ENGINEER && sameCategory(actor, work);
}

export function canPrintCompletionDocument(actor: Actor, work: WorkAccessContext) {
  return Boolean(actor.id) && work.status === WorkStatus.CLOSED;
}
```

- [ ] **Step 6: Write state machine tests**

Create `modules/cm-work/cm-work-state-machine.test.ts`:

```ts
import { WorkStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canTransition } from "./cm-work-state-machine";

describe("canTransition", () => {
  it("allows the main CM workflow", () => {
    expect(canTransition(WorkStatus.NEW, WorkStatus.CLAIMED)).toBe(true);
    expect(canTransition(WorkStatus.CLAIMED, WorkStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLOSE)).toBe(true);
    expect(canTransition(WorkStatus.WAITING_TO_CLOSE, WorkStatus.CLOSED)).toBe(true);
  });

  it("allows release back and return for correction", () => {
    expect(canTransition(WorkStatus.CLAIMED, WorkStatus.WAITING_TO_CLAIM)).toBe(true);
    expect(canTransition(WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLAIM)).toBe(true);
    expect(canTransition(WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION)).toBe(true);
    expect(canTransition(WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.WAITING_TO_CLOSE)).toBe(true);
  });

  it("blocks closed and canceled work from returning to active workflow", () => {
    expect(canTransition(WorkStatus.CLOSED, WorkStatus.IN_PROGRESS)).toBe(false);
    expect(canTransition(WorkStatus.CANCELED, WorkStatus.CLAIMED)).toBe(false);
  });
});
```

- [ ] **Step 7: Implement state machine**

Create `modules/cm-work/cm-work-state-machine.ts`:

```ts
import { WorkStatus } from "@prisma/client";

const allowedTransitions: Record<WorkStatus, WorkStatus[]> = {
  NEW: [WorkStatus.CLAIMED, WorkStatus.CANCELED],
  WAITING_TO_CLAIM: [WorkStatus.CLAIMED, WorkStatus.CANCELED],
  CLAIMED: [WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLAIM, WorkStatus.CANCELED],
  IN_PROGRESS: [WorkStatus.WAITING_TO_CLOSE, WorkStatus.WAITING_TO_CLAIM, WorkStatus.CANCELED],
  WAITING_TO_CLOSE: [WorkStatus.CLOSED, WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CANCELED],
  RETURNED_FOR_CORRECTION: [WorkStatus.WAITING_TO_CLOSE, WorkStatus.CANCELED],
  CLOSED: [],
  CANCELED: [],
};

export function canTransition(from: WorkStatus, to: WorkStatus) {
  return allowedTransitions[from].includes(to);
}
```

- [ ] **Step 8: Implement SLA calculation with tests**

Create `modules/sla/sla-service.test.ts`:

```ts
import { WorkStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isOverdue } from "./sla-service";

const sla = { claimDays: 1, executionDays: 3, reviewDays: 2 };

describe("isOverdue", () => {
  it("uses claim threshold for new and waiting to claim", () => {
    expect(isOverdue(WorkStatus.NEW, new Date("2026-06-01"), new Date("2026-06-03"), sla)).toBe(true);
  });

  it("uses execution threshold for claimed and in progress", () => {
    expect(isOverdue(WorkStatus.IN_PROGRESS, new Date("2026-06-01"), new Date("2026-06-04"), sla)).toBe(false);
    expect(isOverdue(WorkStatus.IN_PROGRESS, new Date("2026-06-01"), new Date("2026-06-05"), sla)).toBe(true);
  });

  it("uses review threshold for waiting to close", () => {
    expect(isOverdue(WorkStatus.WAITING_TO_CLOSE, new Date("2026-06-01"), new Date("2026-06-04"), sla)).toBe(true);
  });
});
```

Create `modules/sla/sla-service.ts`:

```ts
import { WorkStatus } from "@prisma/client";

type Sla = {
  claimDays: number;
  executionDays: number;
  reviewDays: number;
};

const dayMs = 24 * 60 * 60 * 1000;

export function isOverdue(status: WorkStatus, enteredAt: Date, now: Date, sla: Sla) {
  const ageDays = Math.floor((now.getTime() - enteredAt.getTime()) / dayMs);

  if (status === WorkStatus.NEW || status === WorkStatus.WAITING_TO_CLAIM) return ageDays > sla.claimDays;
  if (status === WorkStatus.CLAIMED || status === WorkStatus.IN_PROGRESS) return ageDays > sla.executionDays;
  if (status === WorkStatus.WAITING_TO_CLOSE) return ageDays > sla.reviewDays;

  return false;
}
```

- [ ] **Step 9: Verify domain rules**

Run:

```powershell
npm test
```

Expected:

```text
Test Files 4 passed
```

- [ ] **Step 10: Commit domain rules**

Run:

```powershell
git add modules
git commit -m "feat: add cm domain rules and permissions"
```

## Task 4: Audit Service And CM Work Service

**Files:**
- Create: `modules/audit/audit-types.ts`
- Create: `modules/audit/audit-service.ts`
- Create: `modules/cm-work/cm-work-service.ts`
- Modify: `lib/validation.ts`

- [ ] **Step 1: Create audit event helpers**

Create `modules/audit/audit-types.ts`:

```ts
export type AuditInput = {
  cmWorkId?: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};
```

Create `modules/audit/audit-service.ts`:

```ts
import { db } from "../../lib/db";
import type { AuditInput } from "./audit-types";

export async function recordAudit(input: AuditInput) {
  return db.auditEvent.create({
    data: {
      cmWorkId: input.cmWorkId,
      actorId: input.actorId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
      reason: input.reason,
    },
  });
}
```

- [ ] **Step 2: Create validation schemas**

Create `lib/validation.ts`:

```ts
import { Urgency } from "@prisma/client";
import { z } from "zod";

export const repairRequestSchema = z.object({
  requesterName: z.string().trim().min(1, "กรุณาระบุชื่อผู้แจ้ง"),
  requesterDepartment: z.string().trim().min(1, "กรุณาระบุหน่วยงาน"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  zoneId: z.string().min(1, "กรุณาเลือก Zone"),
  machineName: z.string().trim().min(1, "กรุณาระบุชื่อเครื่องจักร"),
  problemTitle: z.string().trim().min(1, "กรุณาระบุหัวข้อปัญหา"),
  problemDetail: z.string().trim().min(1, "กรุณาระบุรายละเอียดปัญหา"),
  urgency: z.nativeEnum(Urgency),
});

export const workCompletionSchema = z.object({
  rootCause: z.string().trim().min(1, "กรุณาระบุสาเหตุ"),
  correctiveAction: z.string().trim().min(1, "กรุณาระบุวิธีการแก้ไข"),
  workNote: z.string().trim().optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, "กรุณาระบุเหตุผล"),
});
```

- [ ] **Step 3: Implement CM work service**

Create `modules/cm-work/cm-work-service.ts`:

```ts
import { RoleName, WorkStatus } from "@prisma/client";
import { db } from "../../lib/db";
import { canCancelWork, canClaimWork, canCloseWork } from "../auth/permission";
import { recordAudit } from "../audit/audit-service";
import { canTransition } from "./cm-work-state-machine";
import { formatCmWorkNumber } from "./cm-work-number";
import type { Actor } from "./cm-work-types";

export async function createRepairRequest(input: {
  requesterName: string;
  requesterDepartment: string;
  categoryId: string;
  zoneId: string;
  machineName: string;
  problemTitle: string;
  problemDetail: string;
  urgency: "NORMAL" | "URGENT" | "CRITICAL";
}) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const countThisMonth = await db.cmWork.count({
    where: { createdAt: { gte: monthStart, lt: nextMonth } },
  });
  const number = formatCmWorkNumber(now, countThisMonth + 1);

  const work = await db.cmWork.create({
    data: {
      ...input,
      number,
      status: WorkStatus.NEW,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: WorkStatus.NEW,
          note: "Repair request submitted",
        },
      },
    },
  });

  await recordAudit({
    cmWorkId: work.id,
    entityType: "CmWork",
    entityId: work.id,
    action: "CREATE_REPAIR_REQUEST",
    after: work,
  });

  return work;
}

export async function claimWork(actor: Actor, cmWorkId: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canClaimWork(actor, work)) throw new Error("You cannot claim this CM work");
  if (!canTransition(work.status, WorkStatus.CLAIMED)) throw new Error("This status cannot move to claimed");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.CLAIMED,
      claimantId: actor.id,
      claimedAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.CLAIMED,
          changedById: actor.id,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CLAIM_WORK",
    before: work,
    after: updated,
  });

  return updated;
}

export async function closeWork(actor: Actor, cmWorkId: string, engineerNote?: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canCloseWork(actor, work)) throw new Error("You cannot close this CM work");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.CLOSED,
      reviewerId: actor.id,
      engineerNote,
      closedAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.CLOSED,
          changedById: actor.id,
          note: engineerNote,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CLOSE_WORK",
    before: work,
    after: updated,
  });

  return updated;
}

export async function cancelWork(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (!canCancelWork(actor, work)) throw new Error("You cannot cancel this CM work");
  if (!reason.trim()) throw new Error("Cancellation reason is required");

  const updated = await db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.CANCELED,
      canceledReason: reason,
      canceledAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: work.status,
          toStatus: WorkStatus.CANCELED,
          changedById: actor.id,
          note: reason,
        },
      },
    },
  });

  await recordAudit({
    cmWorkId,
    actorId: actor.id,
    entityType: "CmWork",
    entityId: cmWorkId,
    action: "CANCEL_WORK",
    before: work,
    after: updated,
    reason,
  });

  return updated;
}
```

- [ ] **Step 4: Verify service compiles**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 5: Commit services**

Run:

```powershell
git add lib/validation.ts modules/audit modules/cm-work/cm-work-service.ts
git commit -m "feat: add audit and cm work services"
```

## Task 5: Public Portal And Repair Request Flow

**Files:**
- Create: `components/public-header.tsx`
- Create: `components/theme-toggle.tsx`
- Create: `components/work-summary-cards.tsx`
- Create: `components/status-badge.tsx`
- Create: `app/page.tsx`
- Create: `app/request/page.tsx`
- Create: `app/request/success/[number]/page.tsx`
- Create: `app/tracking/page.tsx`

- [ ] **Step 1: Build public header and theme toggle**

Create `components/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

function getThailandHour() {
  const thaiTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  return thaiTime.getHours();
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"day" | "night">("day");

  useEffect(() => {
    const hour = getThailandHour();
    const initial = hour >= 6 && hour < 18 ? "day" : "night";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function updateTheme(nextTheme: "day" | "night") {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="grid h-10 w-44 grid-cols-2 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1">
      <button className={theme === "day" ? "rounded-full bg-[var(--primary)] text-white" : ""} onClick={() => updateTheme("day")} type="button">
        Day
      </button>
      <button className={theme === "night" ? "rounded-full bg-[var(--primary)] text-white" : ""} onClick={() => updateTheme("night")} type="button">
        Night
      </button>
    </div>
  );
}
```

Create `components/public-header.tsx`:

```tsx
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function PublicHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface)] px-8 py-4">
      <Link className="font-bold" href="/">
        Power Plant CM Control Center
      </Link>
      <nav className="flex items-center gap-3">
        <ThemeToggle />
        <Link className="rounded-md bg-[var(--primary)] px-4 py-2 text-white" href="/request">
          แจ้งซ่อม
        </Link>
        <Link className="rounded-md border border-[var(--line)] px-4 py-2" href="/login">
          Login
        </Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Build landing page**

Create `app/page.tsx`:

```tsx
import Link from "next/link";
import { PublicHeader } from "../components/public-header";

export default async function LandingPage() {
  return (
    <main>
      <PublicHeader />
      <section className="grid gap-8 px-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-[var(--line)] px-3 py-1 text-sm text-[var(--muted)]">
            งานไฟฟ้า · งานเครื่องกล · 10 Plant Zones
          </p>
          <h1 className="max-w-4xl text-6xl font-bold leading-tight">
            Corrective Maintenance Control Center
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
            ระบบแจ้งซ่อมและติดตามงาน Corrective Maintenance สำหรับโรงไฟฟ้า
          </p>
          <div className="mt-8 flex gap-3">
            <Link className="rounded-md bg-[var(--primary)] px-5 py-3 text-white" href="/request">
              แจ้งซ่อมทันที
            </Link>
            <Link className="rounded-md border border-[var(--line)] px-5 py-3" href="/tracking">
              ติดตามสถานะ
            </Link>
          </div>
        </div>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-semibold">Public CM Dashboard</h2>
          <p className="mt-2 text-[var(--muted)]">แสดงจำนวนงาน สถานะล่าสุด และรายการแจ้งซ่อมล่าสุดจากระบบ CM</p>
        </section>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Build request form page**

Create `app/request/page.tsx` using a server action:

```tsx
import { redirect } from "next/navigation";
import { PublicHeader } from "../../components/public-header";
import { db } from "../../lib/db";
import { repairRequestSchema } from "../../lib/validation";
import { createRepairRequest } from "../../modules/cm-work/cm-work-service";

async function submitRepairRequest(formData: FormData) {
  "use server";
  const parsed = repairRequestSchema.parse({
    requesterName: formData.get("requesterName"),
    requesterDepartment: formData.get("requesterDepartment"),
    categoryId: formData.get("categoryId"),
    zoneId: formData.get("zoneId"),
    machineName: formData.get("machineName"),
    problemTitle: formData.get("problemTitle"),
    problemDetail: formData.get("problemDetail"),
    urgency: formData.get("urgency"),
  });

  const work = await createRepairRequest(parsed);
  redirect(`/request/success/${work.number}`);
}

export default async function RequestPage() {
  const [categories, zones] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.zone.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <main>
      <PublicHeader />
      <form action={submitRepairRequest} className="mx-auto grid max-w-3xl gap-4 px-8 py-10">
        <h1 className="text-3xl font-bold">แจ้งซ่อม</h1>
        <input name="requesterName" required placeholder="ชื่อผู้แจ้ง" className="rounded-md border p-3" />
        <input name="requesterDepartment" required placeholder="หน่วยงาน/แผนก" className="rounded-md border p-3" />
        <select name="categoryId" required className="rounded-md border p-3">
          <option value="">เลือก Category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select name="zoneId" required className="rounded-md border p-3">
          <option value="">เลือก Zone</option>
          {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
        </select>
        <input name="machineName" required placeholder="ชื่อเครื่องจักร" className="rounded-md border p-3" />
        <input name="problemTitle" required placeholder="หัวข้อปัญหา" className="rounded-md border p-3" />
        <textarea name="problemDetail" required placeholder="รายละเอียดปัญหา" className="min-h-32 rounded-md border p-3" />
        <select name="urgency" required className="rounded-md border p-3">
          <option value="NORMAL">ปกติ</option>
          <option value="URGENT">เร่งด่วน</option>
          <option value="CRITICAL">วิกฤต</option>
        </select>
        <button className="rounded-md bg-[var(--primary)] px-5 py-3 text-white" type="submit">
          ส่งแจ้งซ่อม
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Build success and tracking pages**

Create `app/request/success/[number]/page.tsx`:

```tsx
import Link from "next/link";
import { PublicHeader } from "../../../../components/public-header";

export default function RequestSuccessPage({ params }: { params: { number: string } }) {
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-2xl px-8 py-12">
        <h1 className="text-3xl font-bold">ส่งแจ้งซ่อมสำเร็จ</h1>
        <p className="mt-4 text-lg">เลขที่แจ้งซ่อม: <strong>{params.number}</strong></p>
        <p className="mt-2 text-[var(--muted)]">กรุณาจดเลขที่แจ้งซ่อมไว้สำหรับติดตามสถานะ</p>
        <div className="mt-6 flex gap-3">
          <Link className="rounded-md bg-[var(--primary)] px-4 py-2 text-white" href={`/tracking?number=${params.number}`}>ติดตามสถานะ</Link>
          <Link className="rounded-md border px-4 py-2" href="/request">แจ้งซ่อมรายการใหม่</Link>
        </div>
      </section>
    </main>
  );
}
```

Create `app/tracking/page.tsx`:

```tsx
import { PublicHeader } from "../../components/public-header";
import { db } from "../../lib/db";
import { statusLabels, urgencyLabels } from "../../modules/cm-work/cm-work-types";

export default async function TrackingPage({ searchParams }: { searchParams: { number?: string } }) {
  const number = searchParams.number?.trim();
  const work = number
    ? await db.cmWork.findUnique({ where: { number }, include: { category: true, zone: true } })
    : null;

  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-3xl font-bold">ติดตามสถานะ</h1>
        <form className="mt-6 flex gap-3">
          <input name="number" defaultValue={number} placeholder="CM-2026-06-0001" className="flex-1 rounded-md border p-3" />
          <button className="rounded-md bg-[var(--primary)] px-5 py-3 text-white">ค้นหา</button>
        </form>
        {number && !work ? <p className="mt-6 text-[var(--muted)]">ไม่พบเลขที่แจ้งซ่อมนี้</p> : null}
        {work ? (
          <div className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
            <p><strong>เลขที่แจ้งซ่อม:</strong> {work.number}</p>
            <p><strong>สถานะ:</strong> {statusLabels[work.status]}</p>
            <p><strong>Category:</strong> {work.category.name}</p>
            <p><strong>Zone:</strong> {work.zone.name}</p>
            <p><strong>ชื่อเครื่องจักร:</strong> {work.machineName}</p>
            <p><strong>ความเร่งด่วน:</strong> {urgencyLabels[work.urgency]}</p>
            <p><strong>วันที่แจ้ง:</strong> {work.createdAt.toLocaleString("th-TH")}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Verify public request flow**

Run:

```powershell
npm run dev
```

Manual check:

```text
Open http://localhost:3000/request
Submit a repair request
Confirm success page shows CM-YYYY-MM-0001
Open tracking page and confirm only public-safe fields appear
```

- [ ] **Step 6: Commit public portal**

Run:

```powershell
git add app components
git commit -m "feat: add public repair request flow"
```

## Task 6: Login, Session, Profile, And Signature Upload

**Files:**
- Create: `lib/password.ts`
- Create: `lib/session.ts`
- Create: `lib/file-storage.ts`
- Create: `modules/auth/auth-service.ts`
- Create: `app/login/page.tsx`
- Create: `app/profile/page.tsx`
- Create: `components/signature-preview.tsx`

- [ ] **Step 1: Implement password and session helpers**

Create `lib/password.ts`:

```ts
import bcrypt from "bcryptjs";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
```

Create `lib/session.ts`:

```ts
import { cookies } from "next/headers";
import { db } from "./db";

const sessionCookie = "cm_session_user";

export async function setSession(userId: string) {
  cookies().set(sessionCookie, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession() {
  cookies().delete(sessionCookie);
}

export async function getCurrentUser() {
  const userId = cookies().get(sessionCookie)?.value;
  if (!userId) return null;
  return db.user.findFirst({
    where: { id: userId, active: true },
    include: { category: true, signature: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Login required");
  return user;
}
```

- [ ] **Step 2: Implement auth service and login page**

Create `modules/auth/auth-service.ts`:

```ts
import { db } from "../../lib/db";
import { verifyPassword } from "../../lib/password";

export async function authenticate(username: string, password: string) {
  const user = await db.user.findFirst({ where: { username, active: true } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}
```

Create `app/login/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { PublicHeader } from "../../components/public-header";
import { setSession } from "../../lib/session";
import { authenticate } from "../../modules/auth/auth-service";

async function login(formData: FormData) {
  "use server";
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await authenticate(username, password);
  if (!user) redirect("/login?error=1");
  await setSession(user.id);
  redirect("/dashboard");
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main>
      <PublicHeader />
      <form action={login} className="mx-auto mt-12 grid max-w-sm gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        {searchParams.error ? <p className="text-red-600">Username หรือ password ไม่ถูกต้อง</p> : null}
        <input name="username" required placeholder="Username" className="rounded-md border p-3" />
        <input name="password" required placeholder="Password" type="password" className="rounded-md border p-3" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-3 text-white">เข้าสู่ระบบ</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Implement signature storage**

Create `lib/file-storage.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedMimeTypes = ["image/png", "image/jpeg"];
const maxBytes = 2 * 1024 * 1024;

export async function saveSignatureFile(userId: string, file: File) {
  if (!allowedMimeTypes.includes(file.type)) throw new Error("Signature must be PNG or JPG");
  if (file.size > maxBytes) throw new Error("Signature must be 2 MB or smaller");

  const extension = file.type === "image/png" ? "png" : "jpg";
  const storageDir = process.env.SIGNATURE_STORAGE_DIR ?? "./storage/signatures";
  await mkdir(storageDir, { recursive: true });

  const fileName = `${userId}.${extension}`;
  const storagePath = path.join(storageDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, bytes);

  return {
    fileName,
    mimeType: file.type,
    fileSize: file.size,
    storagePath,
  };
}
```

- [ ] **Step 4: Build profile page**

Create `app/profile/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { saveSignatureFile } from "../../lib/file-storage";
import { requireUser } from "../../lib/session";

async function uploadSignature(formData: FormData) {
  "use server";
  const user = await requireUser();
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) redirect("/profile?error=missing-file");

  const saved = await saveSignatureFile(user.id, file);
  await db.signature.upsert({
    where: { userId: user.id },
    update: saved,
    create: { userId: user.id, ...saved },
  });
  redirect("/profile?uploaded=1");
}

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-bold">My Profile</h1>
      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <p><strong>ชื่อ:</strong> {user.fullName}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Category:</strong> {user.category?.name ?? "-"}</p>
        <p><strong>ลายเซ็น:</strong> {user.signature ? "มีลายเซ็นแล้ว" : "ยังไม่มีลายเซ็น"}</p>
      </section>
      {user.role !== "ADMIN" ? (
        <form action={uploadSignature} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <label className="font-semibold">อัปโหลดลายเซ็น PNG/JPG ไม่เกิน 2 MB</label>
          <input accept="image/png,image/jpeg" name="signature" required type="file" />
          <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">บันทึกลายเซ็น</button>
        </form>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 5: Verify login and profile**

Run:

```powershell
npm run dev
```

Manual check:

```text
Login with admin/admin1234
Open /profile
Confirm profile loads
```

- [ ] **Step 6: Commit auth and profile**

Run:

```powershell
git add lib modules/auth app/login app/profile components/signature-preview.tsx
git commit -m "feat: add login session and profile signature upload"
```

## Task 7: Authenticated App Shell, Dashboard, And Work List

**Files:**
- Create: `components/app-shell.tsx`
- Create: `components/status-badge.tsx`
- Create: `components/filter-bar.tsx`
- Create: `components/cm-calendar.tsx`
- Create: `app/dashboard/page.tsx`
- Create: `app/work/page.tsx`
- Create: `modules/dashboard/dashboard-query.ts`
- Create: `modules/dashboard/dashboard-query.test.ts`

- [ ] **Step 1: Build app shell**

Create `components/app-shell.tsx`:

```tsx
import Link from "next/link";
import { requireUser } from "../lib/session";
import { ThemeToggle } from "./theme-toggle";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-[var(--line)] bg-[var(--surface)] p-5">
        <h1 className="font-bold">CM Control Center</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{user.fullName}</p>
        <nav className="mt-6 grid gap-2">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/work">รายการงานทั้งหมด</Link>
          <Link href="/reports">Export</Link>
          <Link href="/profile">Profile</Link>
          {user.role === "ADMIN" ? <Link href="/admin/users">Admin</Link> : null}
        </nav>
      </aside>
      <main className="ml-64 min-h-screen p-8">
        <div className="mb-6 flex justify-end"><ThemeToggle /></div>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Build status badge**

Create `components/status-badge.tsx`:

```tsx
import { WorkStatus } from "@prisma/client";
import { statusLabels } from "../modules/cm-work/cm-work-types";

const colorByStatus: Record<WorkStatus, string> = {
  NEW: "bg-amber-100 text-amber-800",
  WAITING_TO_CLAIM: "bg-orange-100 text-orange-800",
  CLAIMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  WAITING_TO_CLOSE: "bg-purple-100 text-purple-800",
  RETURNED_FOR_CORRECTION: "bg-rose-100 text-rose-800",
  CLOSED: "bg-green-100 text-green-800",
  CANCELED: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: WorkStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${colorByStatus[status]}`}>{statusLabels[status]}</span>;
}
```

- [ ] **Step 3: Build dashboard query**

Create `modules/dashboard/dashboard-query.ts`:

```ts
import { WorkStatus } from "@prisma/client";
import { db } from "../../lib/db";

export async function getDashboardSummary() {
  const [total, byStatus, latest] = await Promise.all([
    db.cmWork.count(),
    db.cmWork.groupBy({ by: ["status"], _count: { _all: true } }),
    db.cmWork.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { category: true, zone: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((item) => [item.status, item._count._all])) as Partial<Record<WorkStatus, number>>;
  return { total, statusCounts, latest };
}
```

- [ ] **Step 4: Build dashboard and work list pages**

Create `app/dashboard/page.tsx`:

```tsx
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { getDashboardSummary } from "../../modules/dashboard/dashboard-query";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-[var(--muted)]">งานทั้งหมด</p>
          <strong className="text-4xl">{summary.total}</strong>
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold">รายการล่าสุด</h2>
        <div className="mt-4 grid gap-3">
          {summary.latest.map((work) => (
            <a key={work.id} className="grid grid-cols-[1fr_auto] rounded-md border p-3" href={`/work/${work.id}`}>
              <span>{work.number} · {work.machineName} · {work.zone.name}</span>
              <StatusBadge status={work.status} />
            </a>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
```

Create `app/work/page.tsx`:

```tsx
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { db } from "../../lib/db";

export default async function WorkListPage() {
  const works = await db.cmWork.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, zone: true, claimant: true },
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">รายการงานทั้งหมด</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        {works.map((work) => (
          <Link key={work.id} className="grid grid-cols-[1fr_auto] border-b p-4" href={`/work/${work.id}`}>
            <span>{work.number} · {work.machineName} · {work.category.name} · {work.zone.name}</span>
            <StatusBadge status={work.status} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Verify authenticated dashboard**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 6: Commit authenticated shell**

Run:

```powershell
git add app/dashboard app/work components modules/dashboard
git commit -m "feat: add authenticated dashboard and work list"
```

## Task 8: CM Work Detail And Workflow Actions

**Files:**
- Create: `app/work/[id]/page.tsx`
- Modify: `modules/cm-work/cm-work-service.ts`
- Modify: `modules/auth/permission.ts`

- [ ] **Step 1: Add service actions for progress, release, submit review, and return correction**

Extend `modules/cm-work/cm-work-service.ts` with:

```ts
export async function moveToInProgress(actor: Actor, cmWorkId: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id && actor.role !== RoleName.ADMIN) throw new Error("Only claimant can start work");
  if (!canTransition(work.status, WorkStatus.IN_PROGRESS)) throw new Error("Invalid status transition");

  return db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.IN_PROGRESS,
      inProgressAt: new Date(),
      statusHistory: { create: { fromStatus: work.status, toStatus: WorkStatus.IN_PROGRESS, changedById: actor.id } },
    },
  });
}

export async function submitForReview(actor: Actor, cmWorkId: string, input: { rootCause: string; correctiveAction: string; workNote?: string }) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id && actor.role !== RoleName.ADMIN) throw new Error("Only claimant can submit for review");
  if (!canTransition(work.status, WorkStatus.WAITING_TO_CLOSE)) throw new Error("Invalid status transition");

  return db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      ...input,
      status: WorkStatus.WAITING_TO_CLOSE,
      waitingToCloseAt: new Date(),
      statusHistory: { create: { fromStatus: work.status, toStatus: WorkStatus.WAITING_TO_CLOSE, changedById: actor.id } },
    },
  });
}

export async function releaseWork(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (work.claimantId !== actor.id) throw new Error("Only claimant can release work");
  if (!reason.trim()) throw new Error("Release reason is required");
  if (!canTransition(work.status, WorkStatus.WAITING_TO_CLAIM)) throw new Error("Invalid status transition");

  return db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.WAITING_TO_CLAIM,
      claimantId: null,
      releaseReason: reason,
      statusHistory: { create: { fromStatus: work.status, toStatus: WorkStatus.WAITING_TO_CLAIM, changedById: actor.id, note: reason } },
    },
  });
}

export async function returnForCorrection(actor: Actor, cmWorkId: string, reason: string) {
  const work = await db.cmWork.findUniqueOrThrow({ where: { id: cmWorkId } });
  if (actor.role !== RoleName.ADMIN && actor.role !== RoleName.ENGINEER) throw new Error("Only engineer or admin can return work");
  if (actor.role === RoleName.ENGINEER && actor.categoryId !== work.categoryId) throw new Error("Engineer category mismatch");
  if (!reason.trim()) throw new Error("Engineer note is required");
  if (!canTransition(work.status, WorkStatus.RETURNED_FOR_CORRECTION)) throw new Error("Invalid status transition");

  return db.cmWork.update({
    where: { id: cmWorkId },
    data: {
      status: WorkStatus.RETURNED_FOR_CORRECTION,
      returnedReason: reason,
      engineerNote: reason,
      statusHistory: { create: { fromStatus: work.status, toStatus: WorkStatus.RETURNED_FOR_CORRECTION, changedById: actor.id, note: reason } },
    },
  });
}
```

- [ ] **Step 2: Build detail page forms**

Create `app/work/[id]/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { StatusBadge } from "../../../components/status-badge";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { reasonSchema, workCompletionSchema } from "../../../lib/validation";
import { canCancelWork, canClaimWork, canCloseWork } from "../../../modules/auth/permission";
import { cancelWork, claimWork, closeWork, moveToInProgress, releaseWork, returnForCorrection, submitForReview } from "../../../modules/cm-work/cm-work-service";
import { statusLabels, urgencyLabels } from "../../../modules/cm-work/cm-work-types";

async function getActor() {
  const user = await requireUser();
  return { id: user.id, role: user.role, categoryId: user.categoryId };
}

export default async function WorkDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const work = await db.cmWork.findUniqueOrThrow({
    where: { id: params.id },
    include: { category: true, zone: true, claimant: true, reviewer: true, statusHistory: true, auditEvents: true },
  });
  const actor = { id: user.id, role: user.role, categoryId: user.categoryId };

  async function claimAction() {
    "use server";
    await claimWork(await getActor(), params.id);
    redirect(`/work/${params.id}`);
  }

  async function startAction() {
    "use server";
    await moveToInProgress(await getActor(), params.id);
    redirect(`/work/${params.id}`);
  }

  async function submitReviewAction(formData: FormData) {
    "use server";
    const parsed = workCompletionSchema.parse({
      rootCause: formData.get("rootCause"),
      correctiveAction: formData.get("correctiveAction"),
      workNote: formData.get("workNote"),
    });
    await submitForReview(await getActor(), params.id, parsed);
    redirect(`/work/${params.id}`);
  }

  async function releaseAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await releaseWork(await getActor(), params.id, parsed.reason);
    redirect(`/work/${params.id}`);
  }

  async function returnAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await returnForCorrection(await getActor(), params.id, parsed.reason);
    redirect(`/work/${params.id}`);
  }

  async function closeAction(formData: FormData) {
    "use server";
    await closeWork(await getActor(), params.id, String(formData.get("engineerNote") ?? ""));
    redirect(`/work/${params.id}`);
  }

  async function cancelAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await cancelWork(await getActor(), params.id, parsed.reason);
    redirect(`/work/${params.id}`);
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{work.number}</h1>
          <p className="text-[var(--muted)]">{work.machineName} · {work.category.name} · {work.zone.name}</p>
        </div>
        <StatusBadge status={work.status} />
      </div>

      <section className="mt-6 grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <p><strong>ผู้แจ้ง:</strong> {work.requesterName}</p>
        <p><strong>หน่วยงาน:</strong> {work.requesterDepartment}</p>
        <p><strong>ความเร่งด่วน:</strong> {urgencyLabels[work.urgency]}</p>
        <p><strong>หัวข้อ:</strong> {work.problemTitle}</p>
        <p><strong>รายละเอียด:</strong> {work.problemDetail}</p>
        <p><strong>ผู้รับงาน:</strong> {work.claimant?.fullName ?? "-"}</p>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        {canClaimWork(actor, work) ? <form action={claimAction}><button className="rounded-md bg-[var(--primary)] px-4 py-2 text-white">รับงาน</button></form> : null}
        {work.claimantId === user.id ? <form action={startAction}><button className="rounded-md border px-4 py-2">เริ่มดำเนินการ</button></form> : null}
        {canCloseWork(actor, work) ? <a className="rounded-md border px-4 py-2" href={`/work/${work.id}/print`}>ดูเอกสารก่อนปิด</a> : null}
      </section>

      {work.claimantId === user.id ? (
        <form action={submitReviewAction} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">บันทึกช่าง</h2>
          <textarea name="rootCause" defaultValue={work.rootCause ?? ""} required placeholder="สาเหตุ" className="rounded-md border p-3" />
          <textarea name="correctiveAction" defaultValue={work.correctiveAction ?? ""} required placeholder="วิธีการแก้ไข" className="rounded-md border p-3" />
          <textarea name="workNote" defaultValue={work.workNote ?? ""} placeholder="หมายเหตุ" className="rounded-md border p-3" />
          <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">ส่งรอปิดงาน</button>
        </form>
      ) : null}
    </AppShell>
  );
}
```

- [ ] **Step 3: Verify workflow detail page**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 4: Commit workflow actions**

Run:

```powershell
git add app/work modules/cm-work modules/auth lib/validation.ts
git commit -m "feat: add cm work detail and workflow actions"
```

## Task 9: Admin Back Office

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `app/admin/categories/page.tsx`
- Create: `app/admin/zones/page.tsx`
- Create: `app/admin/sla/page.tsx`
- Create: `app/admin/audit/page.tsx`

- [ ] **Step 1: Create admin guard pattern**

Each admin page must start with:

```tsx
const user = await requireUser();
if (user.role !== "ADMIN") redirect("/dashboard");
```

- [ ] **Step 2: Build user management page**

Create `app/admin/users/page.tsx`:

```tsx
import { RoleName } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { hashPassword } from "../../../lib/password";
import { requireUser } from "../../../lib/session";

async function createUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (current.role !== "ADMIN") redirect("/dashboard");

  await db.user.create({
    data: {
      username: String(formData.get("username")),
      passwordHash: await hashPassword(String(formData.get("password"))),
      fullName: String(formData.get("fullName")),
      department: String(formData.get("department") ?? ""),
      role: formData.get("role") as RoleName,
      categoryId: String(formData.get("categoryId") || "") || null,
      active: true,
    },
  });
  redirect("/admin/users");
}

export default async function AdminUsersPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, categories] = await Promise.all([
    db.user.findMany({ include: { category: true, signature: true }, orderBy: { createdAt: "desc" } }),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Users</h1>
      <form action={createUser} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <input name="username" required placeholder="Username" className="rounded-md border p-3" />
        <input name="password" required placeholder="Password" type="password" className="rounded-md border p-3" />
        <input name="fullName" required placeholder="ชื่อ-นามสกุล" className="rounded-md border p-3" />
        <input name="department" placeholder="หน่วยงาน" className="rounded-md border p-3" />
        <select name="role" required className="rounded-md border p-3">
          <option value={RoleName.ADMIN}>Admin</option>
          <option value={RoleName.ENGINEER}>Engineer</option>
          <option value={RoleName.TECHNICIAN}>Technician</option>
        </select>
        <select name="categoryId" className="rounded-md border p-3">
          <option value="">ไม่ผูก Category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">สร้างผู้ใช้</button>
      </form>
      <div className="mt-6 grid gap-2">
        {users.map((item) => (
          <div key={item.id} className="rounded-md border bg-[var(--surface)] p-4">
            {item.fullName} · {item.role} · {item.category?.name ?? "-"} · {item.signature ? "มีลายเซ็น" : "ยังไม่มีลายเซ็น"}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Build category management page**

Create `app/admin/categories/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";

async function createCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  await db.category.create({ data: { name: String(formData.get("name")), active: true } });
  redirect("/admin/categories");
}

async function deactivateCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  await db.category.update({
    where: { id: String(formData.get("id")) },
    data: { active: false },
  });
  redirect("/admin/categories");
}

export default async function AdminCategoriesPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { works: true } } } });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Categories</h1>
      <form action={createCategory} className="mt-6 flex gap-3">
        <input name="name" required placeholder="Category name" className="rounded-md border p-3" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-white">เพิ่ม Category</button>
      </form>
      <div className="mt-6 grid gap-2">
        {categories.map((category) => (
          <div key={category.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border bg-[var(--surface)] p-4">
            <span>{category.name}</span>
            <span>{category.active ? "active" : "inactive"} · used {category._count.works}</span>
            <form action={deactivateCategory}>
              <input name="id" type="hidden" value={category.id} />
              <button className="rounded-md border px-3 py-1" disabled={!category.active}>ปิดใช้งาน</button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Build zone management page**

Create `app/admin/zones/page.tsx` with the same structure as category management, replacing `db.category` with `db.zone`, `categories` with `zones`, and the navigation target with `/admin/zones`. The deactivate action must update `zone.active` to `false` instead of deleting a row.

Acceptance:

```text
Admin can add Zone rows.
Admin can deactivate Zone rows.
Existing CM work keeps its old Zone reference.
```

- [ ] **Step 5: Build SLA settings page**

Create `app/admin/sla/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";

async function updateSla(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  const existing = await db.slaSetting.findFirstOrThrow();
  await db.slaSetting.update({
    where: { id: existing.id },
    data: {
      claimDays: Number(formData.get("claimDays")),
      executionDays: Number(formData.get("executionDays")),
      reviewDays: Number(formData.get("reviewDays")),
    },
  });
  redirect("/admin/sla");
}

export default async function AdminSlaPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  const sla = await db.slaSetting.findFirstOrThrow();

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">SLA Settings</h1>
      <form action={updateSla} className="mt-6 grid max-w-md gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <label>ค้างรับงาน <input className="rounded-md border p-3" min={1} name="claimDays" type="number" defaultValue={sla.claimDays} /></label>
        <label>ค้างดำเนินการ <input className="rounded-md border p-3" min={1} name="executionDays" type="number" defaultValue={sla.executionDays} /></label>
        <label>ค้างตรวจปิด <input className="rounded-md border p-3" min={1} name="reviewDays" type="number" defaultValue={sla.reviewDays} /></label>
        <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">บันทึก SLA</button>
      </form>
    </AppShell>
  );
}
```

- [ ] **Step 6: Build audit page**

Create `app/admin/audit/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";

export default async function AdminAuditPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  const events = await db.auditEvent.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: true, cmWork: true },
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Audit Trail</h1>
      <div className="mt-6 grid gap-2">
        {events.map((event) => (
          <div key={event.id} className="rounded-md border bg-[var(--surface)] p-4">
            <p><strong>{event.action}</strong> · {event.entityType} · {event.createdAt.toLocaleString("th-TH")}</p>
            <p className="text-sm text-[var(--muted)]">Actor: {event.actor?.fullName ?? "System"} · CM: {event.cmWork?.number ?? "-"}</p>
            {event.reason ? <p className="text-sm">Reason: {event.reason}</p> : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 7: Verify admin pages**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 8: Commit admin back office**

Run:

```powershell
git add app/admin
git commit -m "feat: add admin back office"
```

## Task 10: Completion Document Print View

**Files:**
- Create: `modules/documents/completion-document.ts`
- Create: `modules/documents/completion-document.test.ts`
- Create: `app/work/[id]/print/page.tsx`

- [ ] **Step 1: Create document eligibility tests**

Create `modules/documents/completion-document.test.ts`:

```ts
import { WorkStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canRenderCompletionDocument } from "./completion-document";

describe("canRenderCompletionDocument", () => {
  it("renders only closed work", () => {
    expect(canRenderCompletionDocument(WorkStatus.CLOSED)).toBe(true);
    expect(canRenderCompletionDocument(WorkStatus.CANCELED)).toBe(false);
    expect(canRenderCompletionDocument(WorkStatus.WAITING_TO_CLOSE)).toBe(false);
  });
});
```

Create `modules/documents/completion-document.ts`:

```ts
import { WorkStatus } from "@prisma/client";

export function canRenderCompletionDocument(status: WorkStatus) {
  return status === WorkStatus.CLOSED;
}
```

- [ ] **Step 2: Build print page**

Create `app/work/[id]/print/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canRenderCompletionDocument } from "../../../../modules/documents/completion-document";

export default async function PrintCompletionPage({ params }: { params: { id: string } }) {
  await requireUser();
  const work = await db.cmWork.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      zone: true,
      claimant: { include: { signature: true } },
      reviewer: { include: { signature: true } },
    },
  });

  if (!work || !canRenderCompletionDocument(work.status)) notFound();

  return (
    <main className="mx-auto max-w-4xl bg-white p-10 text-black print:p-0">
      <h1 className="text-center text-2xl font-bold">ใบสรุปปิดงาน Corrective Maintenance</h1>
      <p className="mt-6"><strong>เลขที่แจ้งซ่อม:</strong> {work.number}</p>
      <p><strong>วันที่แจ้ง:</strong> {work.createdAt.toLocaleString("th-TH")}</p>
      <p><strong>วันที่รับเรื่อง:</strong> {work.claimedAt?.toLocaleString("th-TH") ?? "-"}</p>
      <p><strong>วันที่ปิดงาน:</strong> {work.closedAt?.toLocaleString("th-TH") ?? "-"}</p>
      <hr className="my-6" />
      <p><strong>ผู้แจ้ง:</strong> {work.requesterName}</p>
      <p><strong>หน่วยงาน:</strong> {work.requesterDepartment}</p>
      <p><strong>Category:</strong> {work.category.name}</p>
      <p><strong>Zone:</strong> {work.zone.name}</p>
      <p><strong>ชื่อเครื่องจักร:</strong> {work.machineName}</p>
      <p><strong>หัวข้อปัญหา:</strong> {work.problemTitle}</p>
      <p><strong>รายละเอียด:</strong> {work.problemDetail}</p>
      <hr className="my-6" />
      <p><strong>สาเหตุ:</strong> {work.rootCause ?? "-"}</p>
      <p><strong>วิธีการแก้ไข:</strong> {work.correctiveAction ?? "-"}</p>
      <div className="mt-16 grid grid-cols-2 gap-12">
        <div className="text-center">
          <div className="h-24 border-b">{work.claimant?.signature ? "Signature image" : ""}</div>
          <p className="mt-2">ผู้ดำเนินการ: {work.claimant?.fullName ?? "-"}</p>
        </div>
        <div className="text-center">
          <div className="h-24 border-b">{work.reviewer?.signature ? "Signature image" : ""}</div>
          <p className="mt-2">ผู้ตรวจรับ: {work.reviewer?.fullName ?? "-"}</p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify document rules**

Run:

```powershell
npm test
npm run build
```

Expected:

```text
Test Files 5 passed
Compiled successfully
```

- [ ] **Step 4: Commit print view**

Run:

```powershell
git add modules/documents app/work/[id]/print
git commit -m "feat: add cm completion document print view"
```

## Task 11: Dashboard Query Model, Filters, Calendar, And Excel Export

**Files:**
- Modify: `modules/dashboard/dashboard-query.ts`
- Create: `components/filter-bar.tsx`
- Create: `components/cm-calendar.tsx`
- Create: `lib/excel.ts`
- Create: `app/reports/page.tsx`

- [ ] **Step 1: Expand dashboard query**

Add grouped counts by status, category, zone, urgency, daily request date, and monthly closed date in `modules/dashboard/dashboard-query.ts`.

Acceptance query output shape:

```ts
type DashboardSummary = {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ categoryName: string; count: number }>;
  byZone: Array<{ zoneName: string; count: number }>;
  byUrgency: Array<{ urgency: string; count: number }>;
  latest: Array<{ id: string; number: string; machineName: string; status: string }>;
};
```

- [ ] **Step 2: Implement Excel helper**

Create `lib/excel.ts`:

```ts
import * as XLSX from "xlsx";

export function createCmWorkWorkbook(rows: Array<Record<string, string | number | null>>) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "CM Work");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
```

- [ ] **Step 3: Build reports export page**

Create `app/reports/page.tsx`:

```tsx
import { RoleName } from "@prisma/client";
import { AppShell } from "../../components/app-shell";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";

export default async function ReportsPage() {
  const user = await requireUser();
  const canExport = user.role === RoleName.ADMIN || user.role === RoleName.ENGINEER;
  const works = canExport
    ? await db.cmWork.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { category: true, zone: true, claimant: true } })
    : [];

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Report Export</h1>
      {!canExport ? <p className="mt-4 text-[var(--muted)]">Role นี้ยังไม่มีสิทธิ์ Export Excel ในรอบแรก</p> : null}
      {canExport ? (
        <div className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <p>รายการที่พร้อม export: {works.length}</p>
          <a className="mt-4 inline-flex rounded-md bg-[var(--primary)] px-4 py-2 text-white" href="/reports/export">
            Export Excel
          </a>
        </div>
      ) : null}
    </AppShell>
  );
}
```

- [ ] **Step 4: Verify dashboard and report permissions**

Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 5: Commit dashboard and export**

Run:

```powershell
git add modules/dashboard components/filter-bar.tsx components/cm-calendar.tsx lib/excel.ts app/reports
git commit -m "feat: add dashboard filters and report export"
```

## Task 12: E2E Tests And Final Verification

**Files:**
- Create: `tests/e2e/public-request.spec.ts`
- Create: `tests/e2e/technician-workflow.spec.ts`
- Create: `tests/e2e/engineer-review.spec.ts`
- Create: `tests/e2e/admin-backoffice.spec.ts`

- [ ] **Step 1: Install browsers**

Run:

```powershell
npx playwright install
```

- [ ] **Step 2: Create public request e2e test**

Create `tests/e2e/public-request.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("requester submits repair request and sees tracking number", async ({ page }) => {
  await page.goto("/request");
  await page.getByPlaceholder("ชื่อผู้แจ้ง").fill("Requester A");
  await page.getByPlaceholder("หน่วยงาน/แผนก").fill("Operations");
  await page.locator("select[name='categoryId']").selectOption({ index: 1 });
  await page.locator("select[name='zoneId']").selectOption({ index: 1 });
  await page.getByPlaceholder("ชื่อเครื่องจักร").fill("Feed Pump");
  await page.getByPlaceholder("หัวข้อปัญหา").fill("Pump vibration");
  await page.getByPlaceholder("รายละเอียดปัญหา").fill("Vibration detected during operation");
  await page.locator("select[name='urgency']").selectOption("URGENT");
  await page.getByRole("button", { name: "ส่งแจ้งซ่อม" }).click();
  await expect(page.getByText(/CM-\d{4}-\d{2}-\d{4}/)).toBeVisible();
});
```

- [ ] **Step 3: Create technician workflow e2e test**

Create `tests/e2e/technician-workflow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("technician claims own-category work and submits for review", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("tech-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.goto("/work");
  await page.getByText(/CM-\d{4}-\d{2}-\d{4}/).first().click();
  await page.getByRole("button", { name: "รับงาน" }).click();
  await page.getByRole("button", { name: "เริ่มดำเนินการ" }).click();
  await page.getByPlaceholder("สาเหตุ").fill("Loose terminal connection");
  await page.getByPlaceholder("วิธีการแก้ไข").fill("Tightened terminal and verified load current");
  await page.getByPlaceholder("หมายเหตุ").fill("No spare part used");
  await page.getByRole("button", { name: "ส่งรอปิดงาน" }).click();
  await expect(page.getByText("รอปิดงาน")).toBeVisible();
});
```

- [ ] **Step 4: Create engineer review e2e test**

Create `tests/e2e/engineer-review.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("engineer closes same-category work and print page opens", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("engineer-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.goto("/work");
  await page.getByText("รอปิดงาน").first().click();
  await page.getByRole("button", { name: "ปิดงาน" }).click();
  await expect(page.getByText("ปิดงานแล้ว")).toBeVisible();
  await page.getByRole("link", { name: /พิมพ์|เอกสาร/ }).click();
  await expect(page.getByText("ใบสรุปปิดงาน Corrective Maintenance")).toBeVisible();
});
```

- [ ] **Step 5: Create admin back office e2e test**

Create `tests/e2e/admin-backoffice.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("admin can open back office pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await page.goto("/admin/categories");
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  await page.goto("/admin/zones");
  await expect(page.getByRole("heading", { name: "Zones" })).toBeVisible();
  await page.goto("/admin/sla");
  await expect(page.getByRole("heading", { name: "SLA Settings" })).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
});
```

- [ ] **Step 6: Run all verification**

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

Expected:

```text
All unit tests pass
Compiled successfully
All Playwright tests pass
```

- [ ] **Step 7: Final commit**

Run:

```powershell
git add tests
git commit -m "test: add cm control center e2e coverage"
```

## Final Acceptance Checklist

- [ ] Public user can open Landing Page.
- [ ] Public user can submit Repair Request without login.
- [ ] System generates CM number as `CM-YYYY-MM-0001`.
- [ ] Public user can track status by CM number.
- [ ] Public tracking hides internal notes, audit, and signatures.
- [ ] Admin can login.
- [ ] Admin can create users and assign role + category.
- [ ] Engineer and Technician can login.
- [ ] Technician can claim work only in own category.
- [ ] Technician can submit completion details for review.
- [ ] Engineer can close work only in own category.
- [ ] Engineer can return work for correction.
- [ ] Admin or same-category Engineer can cancel work with reason.
- [ ] Closed work can be printed by any logged-in role.
- [ ] Canceled work cannot be printed.
- [ ] Missing signature does not block printing.
- [ ] Admin and Engineer can export Excel.
- [ ] Technician cannot export Excel.
- [ ] SLA overdue rules use 1/3/2 day defaults.
- [ ] Day/Night default uses Thailand time.
- [ ] User can manually switch Day/Night after initial load.
- [ ] Audit events exist for create, claim, release, return, close, cancel, urgency change, and admin edit after close.
