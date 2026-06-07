import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { hashPassword } from "../../../lib/password";
import { requireUser } from "../../../lib/session";
import { RoleName, type RoleName as RoleNameValue } from "../../../modules/cm-work/cm-work-types";

async function createUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (current.role !== RoleName.ADMIN) redirect("/dashboard");

  await db.user.create({
    data: {
      username: String(formData.get("username")),
      passwordHash: await hashPassword(String(formData.get("password"))),
      fullName: String(formData.get("fullName")),
      department: String(formData.get("department") ?? ""),
      role: String(formData.get("role")) as RoleNameValue,
      categoryId: String(formData.get("categoryId") || "") || null,
      active: true,
    },
  });
  redirect("/admin/users");
}

export default async function AdminUsersPage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  const [users, categories] = await Promise.all([
    db.user.findMany({ include: { category: true, signature: true }, orderBy: { createdAt: "desc" } }),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Users</h1>
      <form action={createUser} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <input name="username" required placeholder="Username" className="rounded-md border p-3 text-black" />
        <input name="password" required placeholder="Password" type="password" className="rounded-md border p-3 text-black" />
        <input name="fullName" required placeholder="ชื่อ-นามสกุล" className="rounded-md border p-3 text-black" />
        <input name="department" placeholder="หน่วยงาน" className="rounded-md border p-3 text-black" />
        <select name="role" required className="rounded-md border p-3 text-black">
          <option value={RoleName.ADMIN}>Admin</option>
          <option value={RoleName.ENGINEER}>Engineer</option>
          <option value={RoleName.TECHNICIAN}>Technician</option>
        </select>
        <select name="categoryId" className="rounded-md border p-3 text-black">
          <option value="">ไม่ผูก Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">สร้างผู้ใช้</button>
      </form>
      <div className="mt-6 grid gap-2">
        {users.map((item) => (
          <div key={item.id} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
            {item.fullName} · {item.role} · {item.category?.name ?? "-"} · {item.signature ? "มีลายเซ็น" : "ยังไม่มีลายเซ็น"}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
