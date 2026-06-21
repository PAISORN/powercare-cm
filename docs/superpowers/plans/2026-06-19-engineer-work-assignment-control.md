# Engineer Work Assignment Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Admin-controlled global switch that permits engineers to assign eligible CM work only to active technicians in the same category, while Admin assignment remains available at all times.

**Architecture:** Store one global setting in a singleton `SystemSetting` row and centralize assignment authorization in `modules/auth/permission.ts`. Execute claimant update, status history, and audit creation in one Prisma transaction so stale pages and concurrent claims cannot bypass the rule. Server Components read the setting for presentation, but the assignment service reloads and enforces it at mutation time.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5, SQLite development database, Supabase PostgreSQL production schema, Vitest, Testing Library, Playwright browser verification.

---

## File Map

- Modify `prisma/schema.prisma`: local `SystemSetting` model.
- Modify `prisma/schema.supabase.prisma`: PostgreSQL `SystemSetting` model and indexes.
- Modify `prisma/seed.ts`: idempotent global setting seed with assignment disabled.
- Create `prisma/supabase-migrations/20260619_engineer_assignment_control.sql`: reviewed production SQL only; do not apply it.
- Modify `modules/auth/permission.ts`: centralized assignment and settings permissions.
- Modify `modules/auth/permission.test.ts`: permission matrix.
- Create `modules/settings/system-settings-service.ts`: load and update the global setting with audit history.
- Create `modules/settings/system-settings-service.test.ts`: setting defaults and Admin-only mutation tests.
- Modify `modules/cm-work/cm-work-service.ts`: transactional `assignWork` mutation.
- Create `modules/cm-work/cm-work-assignment.test.ts`: assignment success, rejection, and race-condition tests.
- Create `app/admin/settings/page.tsx`: Admin-only switch page.
- Create `app/admin/settings/page.test.ts`: source-level authorization and form contract guard.
- Modify `components/app-nav-links.tsx`: Admin Settings navigation.
- Modify `components/app-nav-links.test.ts`: role visibility coverage.
- Create `components/work-assignment-form.tsx`: technician selector and confirmation control.
- Create `components/work-assignment-form.test.tsx`: form rendering and disabled-state tests.
- Modify `app/work/[id]/page.tsx`: load the setting and eligible technicians, render the assignment form, and call the server mutation.
- Modify `app/admin/audit/page.tsx`: readable labels for setting changes and work assignment.

### Task 1: Centralize the Permission Matrix

**Files:**
- Modify: `modules/auth/permission.test.ts`
- Modify: `modules/auth/permission.ts`

- [ ] **Step 1: Write failing permission tests**

Add these imports and cases to `modules/auth/permission.test.ts`:

```ts
import {
  canAssignWork,
  canCancelWork,
  canClaimWork,
  canCloseWork,
  canPrintCompletionDocument,
  canUpdateSystemSettings,
  canViewMemberWorkload,
} from "./permission";

describe("work assignment permissions", () => {
  const openElectricalWork = {
    status: WorkStatus.NEW,
    categoryId: electrical,
    claimantId: null,
  };

  it("allows admin regardless of the engineer switch", () => {
    const admin = { id: "admin", role: RoleName.ADMIN, categoryId: null };
    expect(canAssignWork(admin, openElectricalWork, false)).toBe(true);
  });

  it("allows engineer only when enabled and category matches", () => {
    const engineer = { id: "eng", role: RoleName.ENGINEER, categoryId: electrical };
    expect(canAssignWork(engineer, openElectricalWork, true)).toBe(true);
    expect(canAssignWork(engineer, openElectricalWork, false)).toBe(false);
    expect(canAssignWork(engineer, { ...openElectricalWork, categoryId: mechanical }, true)).toBe(false);
  });

  it("rejects technicians, claimed work, and terminal work", () => {
    const technician = { id: "tech", role: RoleName.TECHNICIAN, categoryId: electrical };
    expect(canAssignWork(technician, openElectricalWork, true)).toBe(false);
    expect(canAssignWork({ id: "admin", role: RoleName.ADMIN, categoryId: null }, { ...openElectricalWork, claimantId: "other" }, true)).toBe(false);
    expect(canAssignWork({ id: "admin", role: RoleName.ADMIN, categoryId: null }, { ...openElectricalWork, status: WorkStatus.CLOSED }, true)).toBe(false);
  });

  it("allows only admin to update system settings", () => {
    expect(canUpdateSystemSettings(RoleName.ADMIN)).toBe(true);
    expect(canUpdateSystemSettings(RoleName.ENGINEER)).toBe(false);
    expect(canUpdateSystemSettings(RoleName.TECHNICIAN)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run modules/auth/permission.test.ts`

Expected: FAIL because `canAssignWork` and `canUpdateSystemSettings` are not exported.

- [ ] **Step 3: Implement the minimal permission functions**

Add to `modules/auth/permission.ts` and reuse the existing `isClaimableStatus` helper:

```ts
export function canAssignWork(actor: Actor, work: WorkAccessContext, engineerAssignmentEnabled: boolean) {
  if (work.claimantId || !isClaimableStatus(work.status)) return false;
  if (actor.role === RoleName.ADMIN) return true;
  return actor.role === RoleName.ENGINEER && engineerAssignmentEnabled && sameCategory(actor, work);
}

export function canUpdateSystemSettings(role: string) {
  return role === RoleName.ADMIN;
}
```

- [ ] **Step 4: Run the permission tests and verify GREEN**

Run: `npx vitest run modules/auth/permission.test.ts`

Expected: all permission tests PASS.

- [ ] **Step 5: Commit the permission unit**

```powershell
git add modules/auth/permission.ts modules/auth/permission.test.ts
git commit -m "feat: define engineer assignment permissions"
```

### Task 2: Add the Global Setting to Local and Supabase Schemas

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/schema.supabase.prisma`
- Modify: `prisma/seed.ts`
- Create: `prisma/supabase-migrations/20260619_engineer_assignment_control.sql`

- [ ] **Step 1: Add the Prisma model to both schemas**

Append the same model to `prisma/schema.prisma` and `prisma/schema.supabase.prisma`:

```prisma
model SystemSetting {
  id                                String   @id
  engineerWorkAssignmentEnabled     Boolean  @default(false)
  updatedAt                         DateTime @updatedAt
}
```

- [ ] **Step 2: Seed the singleton safely**

Add inside `main()` in `prisma/seed.ts`, after the SLA seed:

```ts
await db.systemSetting.upsert({
  where: { id: "global" },
  update: {},
  create: {
    id: "global",
    engineerWorkAssignmentEnabled: false,
  },
});
```

- [ ] **Step 3: Create reviewed Supabase SQL without applying it**

Create `prisma/supabase-migrations/20260619_engineer_assignment_control.sql`:

```sql
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "engineerWorkAssignmentEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSetting" ("id", "engineerWorkAssignmentEnabled", "updatedAt")
VALUES ('global', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "SystemSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SystemSetting" FROM anon, authenticated;
```

This table is accessed only by server-side Prisma credentials. Do not apply this SQL to Production during implementation.

- [ ] **Step 4: Validate and apply only to the local SQLite development database**

Run:

```powershell
npm run db:show:target
npx prisma format
npx prisma migrate dev --name add_engineer_assignment_control
npm run db:seed
```

Expected: target reports local SQLite, migration succeeds, and the `global` setting exists with `false`. Stop immediately if the target is PostgreSQL or Supabase.

- [ ] **Step 5: Validate the Supabase schema without connecting to Production**

Run: `npx prisma validate --schema prisma/schema.supabase.prisma`

Expected: `The schema at prisma/schema.supabase.prisma is valid`.

- [ ] **Step 6: Commit schema artifacts**

```powershell
git add prisma/schema.prisma prisma/schema.supabase.prisma prisma/seed.ts prisma/migrations prisma/supabase-migrations/20260619_engineer_assignment_control.sql
git commit -m "feat: store engineer assignment setting"
```

### Task 3: Build the Settings Service with Atomic Audit

**Files:**
- Create: `modules/settings/system-settings-service.test.ts`
- Create: `modules/settings/system-settings-service.ts`

- [ ] **Step 1: Write failing service tests with an in-memory repository**

Create `modules/settings/system-settings-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { readEngineerAssignmentSetting, updateEngineerAssignmentSetting, type SystemSettingsStore } from "./system-settings-service";

function createStore(initial?: boolean): SystemSettingsStore & { audits: Array<{ action: string }> } {
  let enabled = initial;
  const audits: Array<{ action: string }> = [];
  return {
    audits,
    async read() {
      return enabled === undefined ? null : { id: "global", engineerWorkAssignmentEnabled: enabled };
    },
    async update(next, actorId) {
      const before = enabled ?? false;
      enabled = next;
      audits.push({ action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING" });
      return { before, after: next, actorId };
    },
  };
}

describe("system settings service", () => {
  it("defaults engineer assignment to disabled when no row exists", async () => {
    expect(await readEngineerAssignmentSetting(createStore())).toBe(false);
  });

  it("lets admin update and records the audit action", async () => {
    const store = createStore(false);
    await updateEngineerAssignmentSetting({ id: "admin", role: RoleName.ADMIN, categoryId: null }, true, store);
    expect(await readEngineerAssignmentSetting(store)).toBe(true);
    expect(store.audits).toEqual([{ action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING" }]);
  });

  it("rejects engineer updates", async () => {
    const store = createStore(false);
    await expect(updateEngineerAssignmentSetting({ id: "eng", role: RoleName.ENGINEER, categoryId: "electrical" }, true, store)).rejects.toThrow("Only admin can update system settings");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run modules/settings/system-settings-service.test.ts`

Expected: FAIL because the service module does not exist.

- [ ] **Step 3: Implement the service and Prisma adapter**

Create `modules/settings/system-settings-service.ts` with this public contract:

```ts
import { db } from "../../lib/db";
import { canUpdateSystemSettings } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";

export type SystemSettingsStore = {
  read(): Promise<{ id: string; engineerWorkAssignmentEnabled: boolean } | null>;
  update(enabled: boolean, actorId: string): Promise<unknown>;
};

const prismaStore: SystemSettingsStore = {
  read: () => db.systemSetting.findUnique({ where: { id: "global" } }),
  update: (enabled, actorId) =>
    db.$transaction(async (tx) => {
      const previous = await tx.systemSetting.findUnique({ where: { id: "global" } });
      const before = previous?.engineerWorkAssignmentEnabled ?? false;
      const updated = await tx.systemSetting.upsert({
        where: { id: "global" },
        update: { engineerWorkAssignmentEnabled: enabled },
        create: { id: "global", engineerWorkAssignmentEnabled: enabled },
      });
      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: "SystemSetting",
          entityId: "global",
          action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING",
          beforeJson: JSON.stringify({ engineerWorkAssignmentEnabled: before }),
          afterJson: JSON.stringify({ engineerWorkAssignmentEnabled: enabled }),
        },
      });
      return updated;
    }),
};

export async function readEngineerAssignmentSetting(store: SystemSettingsStore = prismaStore) {
  return (await store.read())?.engineerWorkAssignmentEnabled ?? false;
}

export async function updateEngineerAssignmentSetting(actor: Actor, enabled: boolean, store: SystemSettingsStore = prismaStore) {
  if (!canUpdateSystemSettings(actor.role)) throw new Error("Only admin can update system settings");
  return store.update(enabled, actor.id);
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npx vitest run modules/settings/system-settings-service.test.ts modules/auth/permission.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit the settings service**

```powershell
git add modules/settings/system-settings-service.ts modules/settings/system-settings-service.test.ts
git commit -m "feat: manage assignment setting with audit"
```

### Task 4: Add Transactional Work Assignment

**Files:**
- Create: `modules/cm-work/cm-work-assignment.test.ts`
- Modify: `modules/cm-work/cm-work-service.ts`

- [ ] **Step 1: Write failing assignment tests against a fake transactional store**

Create `modules/cm-work/cm-work-assignment.test.ts` using the exported `AssignmentStore` and `assignWorkWithStore` contracts:

```ts
import { describe, expect, it } from "vitest";
import { RoleName, WorkStatus, type Actor } from "./cm-work-types";
import { assignWorkWithStore, type AssignmentStore } from "./cm-work-service";

const electricalEngineer: Actor = { id: "eng-electrical", role: RoleName.ENGINEER, categoryId: "electrical" };
const admin: Actor = { id: "admin", role: RoleName.ADMIN, categoryId: null };

function fakeStore(options: {
  enabled?: boolean;
  claimantId?: string | null;
  technicianActive?: boolean;
} = {}): AssignmentStore & { writes: string[] } {
  const writes: string[] = [];
  const technicians = {
    "tech-electrical": { id: "tech-electrical", fullName: "Electrical Technician", role: RoleName.TECHNICIAN, categoryId: "electrical", active: options.technicianActive ?? true },
    "tech-mechanical": { id: "tech-mechanical", fullName: "Mechanical Technician", role: RoleName.TECHNICIAN, categoryId: "mechanical", active: true },
  };
  return {
    writes,
    async getWork() {
      return { id: "work-1", status: WorkStatus.NEW, categoryId: "electrical", claimantId: options.claimantId ?? null };
    },
    async getTechnician(id) {
      return technicians[id as keyof typeof technicians] ?? null;
    },
    async getEngineerAssignmentEnabled() {
      return options.enabled ?? true;
    },
    async claimIfAvailable(input) {
      if (options.claimantId) return null;
      writes.push("work", "status-history", "audit");
      return { id: input.cmWorkId, claimantId: input.technicianId, status: WorkStatus.CLAIMED };
    },
  };
}

describe("assignWorkWithStore", () => {
it("assigns an electrical technician when the engineer switch is enabled", async () => {
  const result = await assignWorkWithStore(fakeStore({ enabled: true }), electricalEngineer, "work-1", "tech-electrical");
  expect(result).toMatchObject({ claimantId: "tech-electrical", status: WorkStatus.CLAIMED });
});

it("rejects engineer assignment when the switch is disabled", async () => {
  await expect(assignWorkWithStore(fakeStore({ enabled: false }), electricalEngineer, "work-1", "tech-electrical")).rejects.toThrow("Engineer work assignment is disabled");
});

it("rejects a technician from another category", async () => {
  await expect(assignWorkWithStore(fakeStore({ enabled: true }), electricalEngineer, "work-1", "tech-mechanical")).rejects.toThrow("Technician category mismatch");
});

it("rejects inactive technicians and already claimed work", async () => {
  await expect(assignWorkWithStore(fakeStore({ technicianActive: false }), admin, "work-1", "tech-electrical")).rejects.toThrow("Technician is inactive");
  await expect(assignWorkWithStore(fakeStore({ claimantId: "other" }), admin, "work-1", "tech-electrical")).rejects.toThrow("CM work is no longer available");
});

it("writes work, history, and audit only after authorization succeeds", async () => {
  const success = fakeStore({ enabled: true });
  await assignWorkWithStore(success, electricalEngineer, "work-1", "tech-electrical");
  expect(success.writes).toEqual(["work", "status-history", "audit"]);

  const rejected = fakeStore({ enabled: false });
  await expect(assignWorkWithStore(rejected, electricalEngineer, "work-1", "tech-electrical")).rejects.toThrow();
  expect(rejected.writes).toEqual([]);
});
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run modules/cm-work/cm-work-assignment.test.ts`

Expected: FAIL because `assignWorkWithStore` does not exist.

- [ ] **Step 3: Add a store boundary and assignment implementation**

Add these types, adapter, and functions to `modules/cm-work/cm-work-service.ts`:

```ts
import type { Prisma } from "@prisma/client";
import { canAssignWork, canCancelWork, canClaimWork, canCloseWork } from "../auth/permission";

type AssignmentWork = {
  id: string;
  status: string;
  categoryId: string;
  claimantId: string | null;
};

type AssignmentTechnician = {
  id: string;
  fullName: string;
  role: string;
  categoryId: string | null;
  active: boolean;
};

export type AssignmentStore = {
  getWork(id: string): Promise<AssignmentWork | null>;
  getTechnician(id: string): Promise<AssignmentTechnician | null>;
  getEngineerAssignmentEnabled(): Promise<boolean>;
  claimIfAvailable(input: {
    cmWorkId: string;
    technicianId: string;
    technicianName: string;
    actorId: string;
    fromStatus: string;
  }): Promise<{ id: string; claimantId: string | null; status: string } | null>;
};

function createPrismaAssignmentStore(tx: Prisma.TransactionClient): AssignmentStore {
  return {
    getWork: (id) => tx.cmWork.findUnique({ where: { id }, select: { id: true, status: true, categoryId: true, claimantId: true } }),
    getTechnician: (id) => tx.user.findUnique({ where: { id }, select: { id: true, fullName: true, role: true, categoryId: true, active: true } }),
    async getEngineerAssignmentEnabled() {
      return (await tx.systemSetting.findUnique({ where: { id: "global" } }))?.engineerWorkAssignmentEnabled ?? false;
    },
    async claimIfAvailable(input) {
      const claimedAt = new Date();
      const result = await tx.cmWork.updateMany({
        where: { id: input.cmWorkId, claimantId: null, status: input.fromStatus },
        data: { claimantId: input.technicianId, status: WorkStatus.CLAIMED, claimedAt },
      });
      if (result.count !== 1) return null;
      await tx.statusHistory.create({
        data: {
          cmWorkId: input.cmWorkId,
          fromStatus: input.fromStatus,
          toStatus: WorkStatus.CLAIMED,
          changedById: input.actorId,
          note: `Assigned to ${input.technicianName}`,
        },
      });
      await tx.auditEvent.create({
        data: {
          cmWorkId: input.cmWorkId,
          actorId: input.actorId,
          entityType: "CmWork",
          entityId: input.cmWorkId,
          action: "ASSIGN_WORK",
          beforeJson: JSON.stringify({ claimantId: null, status: input.fromStatus }),
          afterJson: JSON.stringify({ claimantId: input.technicianId, status: WorkStatus.CLAIMED }),
        },
      });
      return tx.cmWork.findUniqueOrThrow({ where: { id: input.cmWorkId }, select: { id: true, claimantId: true, status: true } });
    },
  };
}

export async function assignWork(actor: Actor, cmWorkId: string, technicianId: string) {
  const updated = await db.$transaction((tx) => assignWorkWithStore(createPrismaAssignmentStore(tx), actor, cmWorkId, technicianId));
  revalidateCmData([cacheTags.dashboardSummary]);
  return updated;
}

export async function assignWorkWithStore(store: AssignmentStore, actor: Actor, cmWorkId: string, technicianId: string) {
const [work, technician, enabled] = await Promise.all([
  store.getWork(cmWorkId),
  store.getTechnician(technicianId),
  store.getEngineerAssignmentEnabled(),
]);

if (!work) throw new Error("CM work not found");
if (!technician || technician.role !== RoleName.TECHNICIAN) throw new Error("Technician not found");
if (!technician.active) throw new Error("Technician is inactive");
if (!canAssignWork(actor, work, enabled)) {
  if (actor.role === RoleName.ENGINEER && !enabled) throw new Error("Engineer work assignment is disabled");
  throw new Error("CM work is no longer available");
}
if (technician.categoryId !== work.categoryId) throw new Error("Technician category mismatch");

const updated = await store.claimIfAvailable({
  cmWorkId,
  technicianId,
  technicianName: technician.fullName,
  actorId: actor.id,
  fromStatus: work.status,
});
if (!updated) throw new Error("CM work is no longer available");
return updated;
}
```

- [ ] **Step 4: Run assignment and permission tests**

Run: `npx vitest run modules/cm-work/cm-work-assignment.test.ts modules/auth/permission.test.ts`

Expected: all tests PASS and rejected cases report zero writes.

- [ ] **Step 5: Commit the assignment service**

```powershell
git add modules/cm-work/cm-work-service.ts modules/cm-work/cm-work-assignment.test.ts
git commit -m "feat: assign CM work transactionally"
```

### Task 5: Add the Admin System Settings Page

**Files:**
- Create: `app/admin/settings/page.test.ts`
- Create: `app/admin/settings/page.tsx`
- Modify: `components/app-nav-links.tsx`
- Modify: `components/app-nav-links.test.ts`
- Modify: `app/admin/audit/page.tsx`

- [ ] **Step 1: Add failing navigation and page-contract tests**

Extend `components/app-nav-links.test.ts`:

```ts
it("shows System Settings only to admin", () => {
  expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/settings")).toBe(true);
  expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/settings")).toBe(false);
  expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/settings")).toBe(false);
});
```

Create `app/admin/settings/page.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin system settings page contract", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/admin/settings/page.tsx"), "utf8");

  it("guards the page and mutation as Admin-only", () => {
    expect(source).toContain("requireUser");
    expect(source).toContain("user.role !== RoleName.ADMIN");
    expect(source).toContain("updateEngineerAssignmentSetting");
  });

  it("submits the engineer assignment checkbox", () => {
    expect(source).toContain('name="engineerWorkAssignmentEnabled"');
    expect(source).toContain('formData.get("engineerWorkAssignmentEnabled") === "on"');
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run components/app-nav-links.test.ts app/admin/settings/page.test.ts`

Expected: FAIL because the link and page do not exist.

- [ ] **Step 3: Add the Admin link**

Import `SlidersHorizontal` from `lucide-react` and add this inside the Admin-only links in `components/app-nav-links.tsx`:

```ts
{ label: "System Settings", href: "/admin/settings", icon: SlidersHorizontal },
```

- [ ] **Step 4: Build the Admin-only page and server action**

Create `app/admin/settings/page.tsx`. The action must derive checkbox state from the submitted form and redirect with a success marker:

```ts
async function updateAssignmentSetting(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  await updateEngineerAssignmentSetting(
    { id: user.id, role: RoleName.ADMIN, categoryId: user.categoryId },
    formData.get("engineerWorkAssignmentEnabled") === "on",
  );
  redirect("/admin/settings?saved=1");
}
```

Render a responsive, unnested settings section with a native checkbox styled as a switch, clear on/off descriptions, a Save button, and `role="status"` success text when `saved=1`. The page must call `readEngineerAssignmentSetting()` for `defaultChecked` and redirect every non-Admin user.

- [ ] **Step 5: Add audit labels**

Add to `actionLabels` in `app/admin/audit/page.tsx`:

```ts
UPDATE_ENGINEER_ASSIGNMENT_SETTING: "เปลี่ยนสิทธิ์การมอบหมายงานของวิศวกร",
ASSIGN_WORK: "มอบหมายงานให้ช่าง",
```

Include both actions in the appropriate `processSteps` groups so their counts appear in the summary.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `npx vitest run components/app-nav-links.test.ts app/admin/settings/page.test.ts`

Expected: all tests PASS.

- [ ] **Step 7: Commit the Admin settings UI**

```powershell
git add app/admin/settings/page.tsx app/admin/settings/page.test.ts components/app-nav-links.tsx components/app-nav-links.test.ts app/admin/audit/page.tsx
git commit -m "feat: let admin control engineer assignment"
```

### Task 6: Add the Work Assignment Control

**Files:**
- Create: `components/work-assignment-form.test.tsx`
- Create: `components/work-assignment-form.tsx`
- Modify: `app/work/[id]/page.tsx`

- [ ] **Step 1: Write failing component tests**

Create `components/work-assignment-form.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkAssignmentForm } from "./work-assignment-form";

describe("WorkAssignmentForm", () => {
  it("lists eligible technicians and submits the selected id", () => {
    render(<WorkAssignmentForm action={vi.fn()} technicians={[{ id: "tech-1", fullName: "Electrical Technician" }]} />);
    expect(screen.getByRole("combobox", { name: "Technician" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "Electrical Technician" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign work" })).toBeInTheDocument();
  });

  it("shows an unavailable message when no technician is eligible", () => {
    render(<WorkAssignmentForm action={vi.fn()} technicians={[]} />);
    expect(screen.getByText("No active technician is available in this category")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign work" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run: `npx vitest run components/work-assignment-form.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused assignment form**

Create `components/work-assignment-form.tsx` with a stable responsive layout:

```tsx
export function WorkAssignmentForm({ action, technicians }: Props) {
  if (technicians.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No active technician is available in this category</p>;
  }

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label className="grid gap-1 text-sm font-semibold">
        Technician
        <select aria-label="Technician" className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3" defaultValue="" name="technicianId" required>
          <option disabled value="">Select technician</option>
          {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.fullName}</option>)}
        </select>
      </label>
      <button className="min-h-11 rounded-md bg-[var(--primary)] px-5 font-bold text-white" type="submit">Assign work</button>
    </form>
  );
}
```

- [ ] **Step 4: Wire the form to work detail with current authorization**

In `app/work/[id]/page.tsx`:

1. Load `readEngineerAssignmentSetting()` alongside the work.
2. Compute `canAssignWork(actor, work, engineerAssignmentEnabled)`.
3. When permitted, query active `TECHNICIAN` users whose `categoryId` equals `work.categoryId`, ordered by `fullName`.
4. Add a server action that validates a non-empty `technicianId`, calls `assignWork(await getActor(), id, technicianId)`, and redirects back to `/work/${id}`.
5. Render `WorkAssignmentForm` in its own un-nested section only when the permission function returns true.

Use this exact query boundary:

```ts
const technicians = mayAssign
  ? await db.user.findMany({
      where: { active: true, role: RoleName.TECHNICIAN, categoryId: work.categoryId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    })
  : [];
```

- [ ] **Step 5: Run component and permission tests**

Run: `npx vitest run components/work-assignment-form.test.tsx modules/auth/permission.test.ts modules/cm-work/cm-work-assignment.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the work-detail UI**

```powershell
git add components/work-assignment-form.tsx components/work-assignment-form.test.tsx app/work/[id]/page.tsx
git commit -m "feat: add work assignment control"
```

### Task 7: Full Verification and Production Safety Gate

**Files:**
- Verify all files above.
- Do not modify Production Supabase or deploy Vercel.

- [ ] **Step 1: Run the focused tests**

Run:

```powershell
npx vitest run modules/auth/permission.test.ts modules/settings/system-settings-service.test.ts modules/cm-work/cm-work-assignment.test.ts components/app-nav-links.test.ts components/work-assignment-form.test.tsx app/admin/settings/page.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run the full automated suite**

Run:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Expected: all tests PASS, TypeScript exits 0, and the production build succeeds.

- [ ] **Step 3: Verify in a local browser as Admin**

At desktop `1440x1000` and mobile `390x844`:

1. Sign in as `admin`.
2. Open `/admin/settings` from both desktop sidebar and mobile drawer.
3. Confirm the switch defaults off and can be saved on/off.
4. Open an unclaimed work item and confirm Admin always sees eligible same-category technicians.
5. Assign the work and confirm claimant, status, status history, and Audit Trail show the assignment.

Expected: no horizontal overflow, no console errors, and all actions remain usable at 390 px.

- [ ] **Step 4: Verify Engineer behavior and stale-page protection**

1. With the switch off, sign in as `engineer-electrical`; confirm no assignment control.
2. Turn the switch on as Admin, sign back in as the engineer, and confirm only electrical technicians appear for electrical work.
3. Open the form as Engineer, then turn the switch off as Admin in another session before submitting.
4. Submit the stale form.

Expected: the stale request is rejected, the work remains unassigned, and no assignment audit/status event is written.

- [ ] **Step 5: Confirm Production remains untouched**

Run: `npm run db:show:target`

Expected: the tested target is the local SQLite development database. Confirm no Vercel deployment, Production migration, Supabase SQL execution, commit push, or merge occurred.

- [ ] **Step 6: Record final verification in the implementation summary**

Report test totals, typecheck/build status, browser viewports, and the explicit statement: `Production database and deployed website were not changed.`
