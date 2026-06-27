import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { cacheTags, revalidateCmData } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

async function createCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/categories");
  const category = await db.category.create({ data: { name, active: true } });
  await recordAudit({
    actorId: user.id,
    entityType: "Category",
    entityId: category.id,
    action: "CREATE_CATEGORY",
    after: { name: category.name, active: category.active },
  });
  revalidateCmData([cacheTags.categories, cacheTags.dashboardSummary]);
  redirect("/admin/categories");
}

async function setCategoryActive(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const before = await db.category.findUniqueOrThrow({ where: { id } });
  const category = await db.category.update({ where: { id }, data: { active } });
  await recordAudit({
    actorId: user.id,
    entityType: "Category",
    entityId: category.id,
    action: active ? "ACTIVATE_CATEGORY" : "DEACTIVATE_CATEGORY",
    before: { name: before.name, active: before.active },
    after: { name: category.name, active: category.active },
  });
  revalidateCmData([cacheTags.categories, cacheTags.dashboardSummary]);
  redirect("/admin/categories");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const id = String(formData.get("id"));
  const before = await db.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { works: true, users: true } } } });
  if (before._count.works > 0 || before._count.users > 0) redirect("/admin/categories?deleteError=1");
  await db.category.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    entityType: "Category",
    entityId: id,
    action: "DELETE_CATEGORY",
    before: { name: before.name, active: before.active },
  });
  revalidateCmData([cacheTags.categories, cacheTags.dashboardSummary]);
  redirect("/admin/categories");
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ deleteError?: string }> }) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const query = await searchParams;
  const categories = await db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { works: true, users: true } } } });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Categories</h1>
      <form action={createCategory} className="mt-6 flex flex-wrap gap-3">
        <input name="name" required placeholder="Category name" className="rounded-md border p-3 text-black" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-white">เพิ่ม Category</button>
      </form>
      {query.deleteError === "1" ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
          ไม่สามารถลบ Category ที่เคยถูกใช้กับงานหรือผูกกับ User ได้ ให้ปิดใช้งานแทน
        </p>
      ) : null}
      <div className="mt-6 grid gap-2">
        {categories.map((category) => (
          <div key={category.id} className="grid gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_auto_auto_auto]">
            <span>{category.name}</span>
            <span>{category.active ? "active" : "inactive"} · works {category._count.works} · users {category._count.users}</span>
            <form action={setCategoryActive}>
              <input name="id" type="hidden" value={category.id} />
              <input name="active" type="hidden" value={category.active ? "false" : "true"} />
              <button className="rounded-md border border-[var(--line)] px-3 py-1">
                {category.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </button>
            </form>
            <form action={deleteCategory}>
              <input name="id" type="hidden" value={category.id} />
              <button className="rounded-md border border-red-500/40 px-3 py-1 text-red-700 disabled:opacity-40" disabled={category._count.works > 0 || category._count.users > 0}>
                ลบ
              </button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
