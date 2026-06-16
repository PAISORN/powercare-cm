import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { cacheTags, revalidateCmData } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

async function createZone(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const zone = await db.zone.create({ data: { name: String(formData.get("name")), active: true } });
  await recordAudit({
    actorId: user.id,
    entityType: "Zone",
    entityId: zone.id,
    action: "CREATE_ZONE",
    after: { name: zone.name, active: zone.active },
  });
  revalidateCmData([cacheTags.zones, cacheTags.dashboardSummary]);
  redirect("/admin/zones");
}

async function deactivateZone(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const id = String(formData.get("id"));
  const before = await db.zone.findUniqueOrThrow({ where: { id } });
  const zone = await db.zone.update({ where: { id }, data: { active: false } });
  await recordAudit({
    actorId: user.id,
    entityType: "Zone",
    entityId: zone.id,
    action: "DEACTIVATE_ZONE",
    before: { name: before.name, active: before.active },
    after: { name: zone.name, active: zone.active },
  });
  revalidateCmData([cacheTags.zones, cacheTags.dashboardSummary]);
  redirect("/admin/zones");
}

export default async function AdminZonesPage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const zones = await db.zone.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { works: true } } } });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Zones</h1>
      <form action={createZone} className="mt-6 flex flex-wrap gap-3">
        <input name="name" required placeholder="Zone name" className="rounded-md border p-3 text-black" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-white">เพิ่ม Zone</button>
      </form>
      <div className="mt-6 grid gap-2">
        {zones.map((zone) => (
          <div key={zone.id} className="grid gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_auto_auto]">
            <span>{zone.name}</span>
            <span>{zone.active ? "active" : "inactive"} · used {zone._count.works}</span>
            <form action={deactivateZone}>
              <input name="id" type="hidden" value={zone.id} />
              <button className="rounded-md border border-[var(--line)] px-3 py-1 disabled:opacity-40" disabled={!zone.active}>
                ปิดใช้งาน
              </button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
