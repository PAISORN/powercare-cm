import { Boxes } from "lucide-react";
import { assetLevelLabel } from "./asset-hierarchy";
import { PreserveListPositionLink } from "./preserve-list-position";
import { formatThaiDate } from "../lib/date-time/bangkok-time";
import type { AssetListPageData } from "../modules/assets/asset-list-page-data";
import {
  assetStatusLabel,
  criticalityLabel,
} from "../modules/assets/asset-service";

type AssetListItem = AssetListPageData["assets"][number];

const listGrid =
  "grid min-w-[1120px] grid-cols-[minmax(300px,2.1fr)_minmax(150px,0.9fr)_minmax(130px,0.75fr)_minmax(150px,0.9fr)_minmax(190px,1.15fr)_minmax(160px,1fr)] gap-3";

export function AssetListTable({
  assets,
  listUrl,
}: {
  assets: AssetListPageData["assets"];
  listUrl: string;
}) {
  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="overflow-x-auto">
        <div
          className={`${listGrid} sticky top-0 z-20 border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-xs font-black uppercase tracking-[.08em] text-slate-700`}
          role="row"
        >
          <span role="columnheader">Assets</span>
          <span role="columnheader">CODE ASSET</span>
          <span role="columnheader">ASSET LEVEL</span>
          <span role="columnheader">AREA / ZONE</span>
          <span role="columnheader">สถานะ PM / CM</span>
          <span role="columnheader">ASSET TYPE</span>
        </div>
        {assets.map((asset) => (
          <AssetRow key={asset.id} asset={asset} listUrl={listUrl} />
        ))}
        {!assets.length ? (
          <div className="min-w-[1120px] px-5 py-16 text-center">
            <Boxes className="mx-auto text-[var(--muted)]" />
            <h2 className="mt-3 font-bold">ยังไม่พบ Asset</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              ลองเปลี่ยนตัวกรองหรือสร้าง Asset รายการแรก
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
function AssetRow({
  asset,
  listUrl,
}: {
  asset: AssetListItem;
  listUrl: string;
}) {
  const level = assetLevelLabel(asset.assetLevel);
  const assetType =
    asset.assetType?.nameTh || asset.assetType?.nameEn || "ยังไม่ระบุ";
  return (
    <div
      id={`asset-row-${asset.id}`}
      className="border-b border-[var(--line)] last:border-0"
    >
      <PreserveListPositionLink
        storageKey="assets"
        targetId={`asset-row-${asset.id}`}
        href={`/assets/${asset.id}?returnTo=${encodeURIComponent(`${listUrl}#asset-row-${asset.id}`)}`}
        className={`${listGrid} min-h-[76px] items-center px-5 py-3 transition hover:bg-[var(--soft)]`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--soft)] text-emerald-600">
            {asset.imageStoragePath ? (
              <img
                src={`/asset-images/${asset.id}`}
                alt={`รูป ${asset.nameEn || asset.nameTh}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <Boxes aria-hidden="true" size={25} />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-bold">
              {asset.nameEn || asset.nameTh}
            </span>
            <span className="mt-1 block truncate text-xs text-[var(--muted)]">
              {assetStatusLabel(asset.operatingStatus)} ·{" "}
              {criticalityLabel(asset.criticality)}
              {asset.tagKks ? ` · ${asset.tagKks}` : ""}
            </span>
          </span>
        </div>
        <span className="truncate font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
          {asset.code}
        </span>
        <span className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
          {level}
        </span>
        <span className="truncate text-sm font-semibold">
          {asset.zone?.name || "ยังไม่ระบุ"}
        </span>
        <ListMaintenanceStatus
          cmStatus={asset.cmWorks[0]?.status || null}
          cmDetail={
            asset.cmWorks[0]?.closedAt
              ? formatThaiDate(asset.cmWorks[0].closedAt)
              : null
          }
          pmStatus={asset.pmWorks[0]?.status || null}
        />
        <span className="truncate text-sm font-semibold" title={assetType}>
          {assetType}
        </span>
      </PreserveListPositionLink>
    </div>
  );
}
function ListMaintenanceStatus({
  cmStatus,
  cmDetail,
  pmStatus,
}: {
  cmStatus: string | null;
  cmDetail: string | null;
  pmStatus: string | null;
}) {
  return (
    <div className="grid gap-1">
      <ListStatusPill kind="CM" status={cmStatus} detail={cmDetail} />
      <ListStatusPill kind="PM" status={pmStatus} />
    </div>
  );
}
function ListStatusPill({
  kind,
  status,
  detail,
}: {
  kind: "CM" | "PM";
  status: string | null;
  detail?: string | null;
}) {
  const label =
    kind === "CM" ? listCmStatusLabel(status) : listPmStatusLabel(status);
  return (
    <span
      className={`w-fit max-w-full truncate rounded-full px-2 py-1 text-[10px] font-bold ${listWorkStatusTone(status)}`}
      title={`${kind}: ${label}${detail ? ` · ${detail}` : ""}`}
    >
      {kind}: {label}
      {detail ? ` · ${detail}` : ""}
    </span>
  );
}
function listCmStatusLabel(status: string | null) {
  return (
    (
      {
        NEW: "แจ้งใหม่",
        WAITING_TO_CLAIM: "รอรับงาน",
        CLAIMED: "รับเรื่องแล้ว",
        IN_PROGRESS: "กำลังดำเนินการ",
        BACKLOG_SHUTDOWN: "Backlog Shutdown",
        WAITING_TO_CLOSE: "รอปิดงาน",
        RETURNED_FOR_CORRECTION: "ส่งกลับแก้ไข",
        CLOSED: "ปิดงานแล้ว",
        CANCELED: "ยกเลิก",
      } as Record<string, string>
    )[status || ""] || "ยังไม่มี"
  );
}
function listPmStatusLabel(status: string | null) {
  return (
    (
      {
        PLANNED: "วางแผนแล้ว",
        IN_PROGRESS: "กำลังดำเนินการ",
        COMPLETED: "เสร็จแล้ว",
        CANCELED: "ยกเลิก",
      } as Record<string, string>
    )[status || ""] || "ยังไม่มี"
  );
}
function listWorkStatusTone(status: string | null) {
  if (["CLOSED", "COMPLETED"].includes(status || ""))
    return "bg-emerald-100 text-emerald-700";
  if (["IN_PROGRESS", "CLAIMED", "WAITING_TO_CLOSE"].includes(status || ""))
    return "bg-blue-100 text-blue-700";
  if (["PLANNED", "NEW", "WAITING_TO_CLAIM"].includes(status || ""))
    return "bg-violet-100 text-violet-700";
  if (["BACKLOG_SHUTDOWN", "RETURNED_FOR_CORRECTION"].includes(status || ""))
    return "bg-amber-100 text-amber-700";
  if (status === "CANCELED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-500";
}
