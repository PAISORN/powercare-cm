import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Clock3,
  LayoutGrid,
  List,
  ListFilter,
  Search,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "../status-badge";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { paginationWindow } from "../../lib/pagination-window";
import {
  activityBoardRedirect,
  activityBoardType,
  activityFeedToneClass,
  activityRedirect,
  activitySelectionHref,
  activityStatusLabel,
} from "../../modules/activities/activity-page-model";
import type {
  ActivityBoardFilter,
  ActivityFeedItem,
  ActivityScope,
  ActivityView,
} from "../../modules/activities/activity-types";
import { ActivityEmptyState } from "./activity-primitives";
export function ActivityViewToggle({
  activeView,
  scope,
}: {
  activeView: ActivityView;
  scope: ActivityScope;
}) {
  const options: Array<{
    icon: typeof List;
    label: string;
    value: ActivityView;
  }> = [
    { icon: List, label: "รายการ", value: "current" },
    { icon: LayoutGrid, label: "การ์ด", value: "visual" },
  ];

  return (
    <div
      aria-label="รูปแบบการแสดงกิจกรรม"
      className="inline-flex rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-1"
      role="group"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = activeView === option.value;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold transition ${
              active
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            }`}
            href={activityRedirect(scope, { activityView: option.value })}
            key={option.value}
          >
            <Icon size={18} />
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ActivityBoardView({
  allItems,
  filters,
  items,
  scope,
  selectedKey,
}: {
  allItems: ActivityFeedItem[];
  filters: ActivityBoardFilter;
  items: ActivityFeedItem[];
  scope: ActivityScope;
  selectedKey?: string;
}) {
  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(filters.page, totalPages);
  const visibleItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const counts = {
    all: allItems.length,
    cm: allItems.filter((item) => activityBoardType(item) === "cm").length,
    store: allItems.filter((item) => activityBoardType(item) === "store")
      .length,
    review: allItems.filter((item) => activityBoardType(item) === "review")
      .length,
  };
  const tabs: Array<{ label: string; value: ActivityBoardFilter["type"] }> = [
    { label: "ทั้งหมด", value: "all" },
    { label: "CM", value: "cm" },
    { label: "Store", value: "store" },
    { label: "ตรวจรับ", value: "review" },
  ];
  const startItem = visibleItems.length ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, items.length);

  return (
    <div className="activity-board-view rounded-3xl border border-[var(--line)] bg-[var(--bg)]/30 p-4">
      <div className="activity-board-toolbar grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="activity-board-tabs flex flex-wrap overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {tabs.map((tab) => {
            const active = filters.type === tab.value;
            return (
              <Link
                className={`min-h-12 border-r border-[var(--line)] px-5 py-3 text-sm font-extrabold transition last:border-r-0 ${
                  active
                    ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-[inset_0_-2px_0_var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                }`}
                href={activityBoardRedirect(scope, {
                  ...filters,
                  page: 1,
                  type: tab.value,
                })}
                key={tab.value}
              >
                {tab.label} <span className="ml-2">{counts[tab.value]}</span>
              </Link>
            );
          })}
        </div>

        <form
          action="/activities"
          className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_130px_120px]"
        >
          <input name="activityView" type="hidden" value="visual" />
          <input
            name="organizationId"
            type="hidden"
            value={scope.organization.id}
          />
          <input name="plantId" type="hidden" value={scope.plant.id} />
          <input name="activityType" type="hidden" value={filters.type} />
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={19}
            />
            <input
              className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-12 pr-4 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              defaultValue={filters.search}
              name="activitySearch"
              placeholder="ค้นหาเลขที่งานหรืออุปกรณ์"
            />
          </label>
          <div className="hidden">
            <Building2
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={18}
            />
            ไซต์ทั้งหมด
          </div>
          <label className="relative block">
            <ListFilter
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={18}
            />
            <select
              className="min-h-12 w-full appearance-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-11 pr-4 text-sm font-bold text-[var(--ink)] outline-none"
              defaultValue={filters.status}
              name="activityStatus"
            >
              <option value="all">สถานะทั้งหมด</option>
              {Array.from(new Set(allItems.map((item) => item.status))).map(
                (status) => (
                  <option key={status} value={status}>
                    {activityStatusLabel(status)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="relative block">
            <ArrowDownUp
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={18}
            />
            <select
              className="min-h-12 w-full appearance-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-11 pr-4 text-sm font-bold text-[var(--ink)] outline-none"
              defaultValue={filters.sort}
              name="activitySort"
            >
              <option value="latest">ล่าสุด</option>
              <option value="oldest">เก่าสุด</option>
            </select>
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--primary-strong)]">
            <Search size={17} />
            ค้นหา
          </button>
        </form>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,300px))]">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <ActivityBoardCard
              item={item}
              key={item.key}
              scope={scope}
              selected={selectedKey === item.key}
              selectionHref={activitySelectionHref(scope, filters, item.key)}
            />
          ))
        ) : (
          <div className="2xl:col-span-3 lg:col-span-2">
            <ActivityEmptyState text="ไม่พบกิจกรรมตามเงื่อนไขที่เลือก" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--muted)]">
          แสดง {startItem}-{endItem} จาก {items.length} งาน
        </p>
        <div className="flex items-center gap-2">
          <Link
            aria-disabled={currentPage <= 1}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] font-extrabold transition hover:border-[var(--primary)] hover:text-[var(--primary)] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            href={activityBoardRedirect(scope, {
              ...filters,
              page: Math.max(1, currentPage - 1),
            })}
          >
            ‹
          </Link>
          {paginationWindow(currentPage, totalPages).map((page) => {
            return (
              <Link
                className={`inline-flex size-11 items-center justify-center rounded-xl border text-sm font-extrabold transition ${
                  currentPage === page
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : "border-[var(--line)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
                href={activityBoardRedirect(scope, { ...filters, page })}
                key={page}
              >
                {page}
              </Link>
            );
          })}
          <Link
            aria-disabled={currentPage >= totalPages}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] font-extrabold transition hover:border-[var(--primary)] hover:text-[var(--primary)] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            href={activityBoardRedirect(scope, {
              ...filters,
              page: Math.min(totalPages, currentPage + 1),
            })}
          >
            ›
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActivityBoardCard({
  item,
  selected,
  selectionHref,
  scope,
}: {
  item: ActivityFeedItem;
  selected: boolean;
  selectionHref: string;
  scope: ActivityScope;
}) {
  const type = activityBoardType(item);
  const toneClass = activityFeedToneClass(item.status, item.kind);
  const iconClass = {
    cm: Wrench,
    review: ClipboardCheck,
    store: ShoppingCart,
  }[type];
  const Icon = iconClass;
  const title =
    item.kind === "work"
      ? item.work.problemTitle
      : (item.issue.items[0]?.sparePart.name ?? item.title);
  const subline = item.kind === "work" ? item.work.category.name : "Store";

  return (
    <Link
      className={`activity-board-card dashboard-kpi dashboard-kpi-glow group relative block h-36 w-full overflow-hidden rounded-2xl border p-5 transition duration-300 ${toneClass} ${
        selected
          ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]"
          : ""
      }`}
      href={selectionHref}
    >
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 pr-8">
        <div className="activity-board-icon flex size-12 items-center justify-center rounded-2xl border">
          <Icon size={27} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-[var(--muted)]">
            {item.title}
          </p>
          <h3 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight">
            {title}
          </h3>
          <p className="mt-2 truncate text-sm font-semibold text-[var(--muted)]">
            {scope.plant.name} <span className="mx-2">•</span> {subline}
          </p>
          <p className="hidden">
            <Clock3 size={16} />
            ครบกำหนด {formatThaiDateTime(item.occurredAt)}
          </p>
        </div>
        <div className="absolute inset-y-4 right-3 flex flex-col items-end justify-between">
          <span className="activity-board-status max-w-24 truncate rounded-xl border px-2 py-1 text-xs font-extrabold">
            {type === "store" ? "Store" : activityStatusLabel(item.status)}
          </span>
          <span className="activity-board-arrow inline-flex size-11 items-center justify-center rounded-xl border transition">
            <ArrowRight size={22} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function UnifiedActivityList({
  items,
  scope,
  selectedKey,
  variant = "current",
}: {
  items: ActivityFeedItem[];
  scope: ActivityScope;
  selectedKey?: string;
  variant?: ActivityView;
}) {
  if (!items.length)
    return <ActivityEmptyState text="ยังไม่มีกิจกรรมที่ต้องดำเนินการ" />;
  return (
    <div
      className={
        variant === "visual"
          ? "activity-card-view grid gap-3 xl:grid-cols-2"
          : "divide-y divide-[var(--line)] border-y border-[var(--line)]"
      }
    >
      {items.map((item) => (
        <ActivityFeedRow
          item={item}
          key={item.key}
          scope={scope}
          selected={selectedKey === item.key}
          variant={variant}
        />
      ))}
    </div>
  );
}

function ActivityFeedRow({
  item,
  scope,
  selected,
  variant = "current",
}: {
  item: ActivityFeedItem;
  scope: ActivityScope;
  selected: boolean;
  variant?: ActivityView;
}) {
  const selectionHref = activitySelectionHref(
    scope,
    undefined,
    item.key,
    "current",
  );
  const toneClass = activityFeedToneClass(item.status, item.kind);
  const rowClass =
    variant === "visual"
      ? `activity-card-view group rounded-3xl border transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow)] ${toneClass}`
      : "activity-row-two-line group transition duration-200 hover:bg-[var(--soft)]";
  const selectedClass =
    selected && variant === "visual"
      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
      : selected
        ? "bg-[var(--primary)]/5"
        : "";
  return (
    <Link
      className={`${rowClass} ${selectedClass} block text-[var(--ink)]`}
      href={selectionHref}
    >
      <div
        className={
          variant === "visual"
            ? "grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            : "grid min-h-16 gap-3 px-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        }
      >
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{item.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
            {item.subtitle}
          </p>
          {variant === "visual" ? (
            <p className="hidden">{formatThaiDateTime(item.occurredAt)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {item.kind === "work" && item.highlight ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              ควรอัปเดต
            </span>
          ) : null}
          {item.kind === "work" ? (
            <StatusBadge status={item.status} />
          ) : (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              Store
            </span>
          )}
          <span
            className={`inline-flex size-9 items-center justify-center rounded-xl border transition ${
              variant === "current"
                ? "border-[var(--line)] bg-transparent text-[var(--muted)] group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]"
                : "border-[var(--line)] bg-[var(--surface)] group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]"
            }`}
          >
            <ArrowRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}
