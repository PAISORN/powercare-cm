import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

async function updateSla(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
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
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const sla = await db.slaSetting.findFirstOrThrow();

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">SLA Settings</h1>
      <form action={updateSla} className="mt-6 grid max-w-md gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <label className="grid gap-1">
          ค้างรับงาน
          <input className="rounded-md border p-3 text-black" min={1} name="claimDays" type="number" defaultValue={sla.claimDays} />
        </label>
        <label className="grid gap-1">
          ค้างดำเนินการ
          <input className="rounded-md border p-3 text-black" min={1} name="executionDays" type="number" defaultValue={sla.executionDays} />
        </label>
        <label className="grid gap-1">
          ค้างตรวจปิด
          <input className="rounded-md border p-3 text-black" min={1} name="reviewDays" type="number" defaultValue={sla.reviewDays} />
        </label>
        <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">บันทึก SLA</button>
      </form>
    </AppShell>
  );
}
