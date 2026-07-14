import { History } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
};

export default async function StockMovementsPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  if (
    !canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) &&
    !canUseUserPermission(user, PermissionKey.VIEW_STORE_REPORTS) &&
    !canUseUserPermission(user, PermissionKey.ADJUST_STOCK)
  ) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const movements = await db.stockMovement.findMany({
    where: { organizationId: scope.organization.id, plantId: scope.plant.id },
    include: {
      actor: { select: { fullName: true } },
      store: { select: { code: true, name: true } },
      sparePart: { select: { code: true, itemCode: true, name: true, unit: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
          <p className="text-sm font-semibold text-[var(--muted)]">Home &gt; Inventory &gt; Stock Movement</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--soft)] text-[var(--primary)]">
              <History size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Stock Movement ล่าสุด</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">ประวัติรับเข้า เบิกจ่าย และปรับยอดของ Site ที่เลือก</p>
            </div>
          </div>
        </header>

        <AdminSiteScopeSelector
          action="/inventory/movements"
          description="เลือก Organization และ Site เพื่อดูประวัติการเคลื่อนไหวของสต็อก"
          scope={scope}
          title="Stock movement scope"
        />

        <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-4">เวลา</th>
                  <th className="px-4 py-4">ประเภท</th>
                  <th className="px-4 py-4">อะไหล่</th>
                  <th className="px-4 py-4">Item code</th>
                  <th className="px-4 py-4">Store</th>
                  <th className="px-4 py-4 text-right">เปลี่ยนแปลง</th>
                  <th className="px-4 py-4 text-right">คงเหลือ</th>
                  <th className="px-4 py-4">ดำเนินการ / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr className="border-t border-[var(--line)] transition hover:bg-[var(--soft)]/60" key={movement.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatThaiMediumDateTime(movement.occurredAt)}</td>
                    <td className="px-4 py-3 font-bold">{movement.movementType}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{movement.sparePart.name}</p>
                      <p className="font-mono text-xs text-[var(--muted)]">{movement.sparePart.code}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{movement.sparePart.itemCode ?? "-"}</td>
                    <td className="px-4 py-3">
                      {movement.store.code} · {movement.store.name}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold">
                      {formatQuantity(Number(movement.quantityChange))} {movement.sparePart.unit}
                    </td>
                    <td className="px-4 py-3 text-right">{formatQuantity(Number(movement.balanceAfter))}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">
                      {movement.actor?.fullName ?? "-"} {movement.note ? `· ${movement.note}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!movements.length ? (
              <div className="p-10 text-center text-sm text-[var(--muted)]">ยังไม่มี Stock Movement ใน Site นี้</div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
