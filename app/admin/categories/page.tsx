import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

async function createCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const category = await db.category.create({ data: { name: String(formData.get("name")), active: true } });
  await recordAudit({
    actorId: user.id,
    entityType: "Category",
    entityId: category.id,
    action: "CREATE_CATEGORY",
    after: { name: category.name, active: category.active },
  });
  redirect("/admin/categories");
}

async function deactivateCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const id = String(formData.get("id"));
  const before = await db.category.findUniqueOrThrow({ where: { id } });
  const category = await db.category.update({ where: { id }, data: { active: false } });
  await recordAudit({
    actorId: user.id,
    entityType: "Category",
    entityId: category.id,
    action: "DEACTIVATE_CATEGORY",
    before: { name: before.name, active: before.active },
    after: { name: category.name, active: category.active },
  });
  redirect("/admin/categories");
}

export default async function AdminCategoriesPage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { works: true } } } });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Categories</h1>
      <form action={createCategory} className="mt-6 flex flex-wrap gap-3">
        <input name="name" required placeholder="Category name" className="rounded-md border p-3 text-black" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-white">เพิ่ม Category</button>
      </form>
      <div className="mt-6 grid gap-2">
        {categories.map((category) => (
          <div key={category.id} className="grid gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_auto_auto]">
            <span>{category.name}</span>
            <span>{category.active ? "active" : "inactive"} · used {category._count.works}</span>
            <form action={deactivateCategory}>
              <input name="id" type="hidden" value={category.id} />
              <button className="rounded-md border border-[var(--line)] px-3 py-1 disabled:opacity-40" disabled={!category.active}>
                ปิดใช้งาน
              </button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
