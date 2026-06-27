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
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/zones");
  const zone = await db.zone.create({ data: { name, active: true } });
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

async function setZoneActive(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const before = await db.zone.findUniqueOrThrow({ where: { id } });
  const zone = await db.zone.update({ where: { id }, data: { active } });
  await recordAudit({
    actorId: user.id,
    entityType: "Zone",
    entityId: zone.id,
    action: active ? "ACTIVATE_ZONE" : "DEACTIVATE_ZONE",
    before: { name: before.name, active: before.active },
    after: { name: zone.name, active: zone.active },
  });
  revalidateCmData([cacheTags.zones, cacheTags.dashboardSummary]);
  redirect("/admin/zones");
}

async function deleteZone(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const id = String(formData.get("id"));
  const before = await db.zone.findUniqueOrThrow({ where: { id }, include: { _count: { select: { works: true } } } });
  if (before._count.works > 0) redirect("/admin/zones?deleteError=1");
  await db.zone.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    entityType: "Zone",
    entityId: id,
    action: "DELETE_ZONE",
    before: { name: before.name, active: before.active },
  });
  revalidateCmData([cacheTags.zones, cacheTags.dashboardSummary]);
  redirect("/admin/zones");
}

export default async function AdminZonesPage({ searchParams }: { searchParams: Promise<{ deleteError?: string }> }) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const query = await searchParams;
  const zones = await db.zone.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { works: true } } } });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Zones</h1>
      <form action={createZone} className="mt-6 flex flex-wrap gap-3">
        <input name="name" required placeholder="Zone name" className="rounded-md border p-3 text-black" />
        <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-white">เพิ่ม Zone</button>
      </form>
      {query.deleteError === "1" ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300">
          ไม่สามารถลบ Zone ที่เคยถูกใช้กับงานได้ ให้ปิดใช้งานแทน
        </p>
      ) : null}
      <div className="mt-6 grid gap-2">
        {zones.map((zone) => (
          <div key={zone.id} className="grid gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-[1fr_auto_auto_auto]">
            <span>{zone.name}</span>
            <span>{zone.active ? "active" : "inactive"} · used {zone._count.works}</span>
            <form action={setZoneActive}>
              <input name="id" type="hidden" value={zone.id} />
              <input name="active" type="hidden" value={zone.active ? "false" : "true"} />
              <button className="rounded-md border border-[var(--line)] px-3 py-1">
                {zone.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
              </button>
            </form>
            <form action={deleteZone}>
              <input name="id" type="hidden" value={zone.id} />
              <button className="rounded-md border border-red-500/40 px-3 py-1 text-red-700 disabled:opacity-40" disabled={zone._count.works > 0}>
                ลบ
              </button>
            </form>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
