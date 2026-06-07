import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

export default async function AdminAuditPage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
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
          <div key={event.id} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
            <p>
              <strong>{event.action}</strong> · {event.entityType} · {event.createdAt.toLocaleString("th-TH")}
            </p>
            <p className="text-sm text-[var(--muted)]">
              Actor: {event.actor?.fullName ?? "System"} · CM: {event.cmWork?.number ?? "-"}
            </p>
            {event.reason ? <p className="text-sm">Reason: {event.reason}</p> : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
