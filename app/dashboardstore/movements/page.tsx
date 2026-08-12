import { ChevronLeft, ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { StockHeaderReplacementController } from "../../../components/stock-header-replacement-controller";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { paginationWindow } from "../../../lib/pagination-window";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  page?: string;
};

export default async function StockMovementsPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  if (
    !canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) &&
    !canUseUserPermission(user, PermissionKey.VIEW_STORE_REPORTS) &&
    !canUseUserPermission(user, PermissionKey.ADJUST_STOCK)
  ) {
    redirect("/dashboardcm");
  }

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const where = { organizationId: scope.organization.id, plantId: scope.plant.id };
  const pageSize = 50;
  const totalItems = await db.stockMovement.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, totalPages)
    : 1;
  const movements = await db.stockMovement.findMany({
      where,
      include: {
        actor: { select: { fullName: true } },
        store: { select: { code: true, name: true } },
        sparePart: {
          select: {
            code: true,
            itemCode: true,
            name: true,
            unit: true,
            type: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const movementPageHref = (page: number) => {
    const params = new URLSearchParams({
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    });
    if (page > 1) params.set("page", String(page));
    return `/dashboardstore/movements?${params.toString()}#stock-movement-table-region`;
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="menu-heading-plain rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
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
          action="/dashboardstore/movements"
          description="เลือก Organization และ Site เพื่อดูประวัติการเคลื่อนไหวของสต็อก"
          scope={scope}
          title="Stock movement scope"
        />

        <StockHeaderReplacementController regionId="stock-movement-table-region" />
        <section
          className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
          id="stock-movement-table-region"
        >
          <div aria-hidden="true" className="stock-replacement-header" data-stock-replacement-header>
            <table className="w-full min-w-[920px] table-fixed text-left text-sm">
              <MovementTableColGroup />
              <thead className="bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]">
                <MovementTableHeaderRow />
              </thead>
            </table>
          </div>
          <div className="relative overflow-x-auto rounded-t-3xl bg-[var(--surface)]" data-stock-table-scroll>
            <table className="w-full min-w-[920px] table-fixed text-left text-sm">
              <MovementTableColGroup />
              <thead
                className="sticky top-0 z-40 bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)] shadow-[0_1px_0_var(--line)]"
                data-stock-table-header
              >
                <MovementTableHeaderRow />
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr className="border-t border-[var(--line)] transition hover:bg-[var(--soft)]/60" key={movement.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatThaiMediumDateTime(movement.occurredAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-bold">{movement.sparePart.type?.code ?? "-"}</p>
                      {movement.sparePart.type?.name ? (
                        <p className="mt-1 text-xs text-[var(--muted)]">{movement.sparePart.type.name}</p>
                      ) : null}
                    </td>
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
                      <span className="font-bold text-[var(--text)]">{movement.movementType}</span>
                      {" · "}{movement.actor?.fullName ?? "-"} {movement.note ? `· ${movement.note}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!movements.length ? (
              <div className="p-10 text-center text-sm text-[var(--muted)]">ยังไม่มี Stock Movement ใน Site นี้</div>
            ) : null}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
            <span>แสดง {firstItem}-{lastItem} จาก {totalItems} รายการ · หน้า {currentPage}/{totalPages}</span>
            {totalPages > 1 ? (
              <nav aria-label="Stock movement pagination" className="flex items-center gap-1">
                <Link
                  aria-disabled={currentPage === 1}
                  aria-label="หน้าก่อนหน้า"
                  className={paginationArrowClass(currentPage === 1)}
                  href={movementPageHref(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft size={16} />
                </Link>
                {paginationWindow(currentPage, totalPages).map((pageNumber) => (
                  <Link
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    className={paginationPageClass(pageNumber === currentPage)}
                    href={movementPageHref(pageNumber)}
                    key={pageNumber}
                  >
                    {pageNumber}
                  </Link>
                ))}
                <Link
                  aria-disabled={currentPage === totalPages}
                  aria-label="หน้าถัดไป"
                  className={paginationArrowClass(currentPage === totalPages)}
                  href={movementPageHref(Math.min(totalPages, currentPage + 1))}
                >
                  <ChevronRight size={16} />
                </Link>
              </nav>
            ) : null}
          </footer>
        </section>
      </div>
    </AppShell>
  );
}

function MovementTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: "145px" }} />
      <col style={{ width: "110px" }} />
      <col style={{ width: "205px" }} />
      <col style={{ width: "105px" }} />
      <col style={{ width: "155px" }} />
      <col style={{ width: "115px" }} />
      <col style={{ width: "95px" }} />
      <col style={{ width: "235px" }} />
    </colgroup>
  );
}

function MovementTableHeaderRow() {
  return (
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
  );
}

function paginationPageClass(isActive: boolean) {
  return [
    "inline-flex size-9 items-center justify-center rounded-xl text-sm font-extrabold transition",
    isActive
      ? "bg-[var(--primary)] text-white shadow-sm"
      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--soft)]",
  ].join(" ");
}

function paginationArrowClass(isDisabled: boolean) {
  return [
    "inline-flex size-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition hover:bg-[var(--soft)]",
    isDisabled ? "pointer-events-none opacity-45" : "",
  ].join(" ");
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}
