 "use client";

import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { statusLabels, urgencyLabels, Urgency, WorkStatus } from "../modules/cm-work/cm-work-types";
import { AutoSubmitSelect } from "./auto-submit-select";
import { CmDateFilterBar } from "./cm-date-filter-bar";

type Option = {
  id: string;
  name: string;
};

type FilterValues = {
  search?: string;
  status?: string;
  categoryId?: string;
  zoneId?: string;
  urgency?: string;
  claimantId?: string;
  mode?: "day" | "range" | "month" | "year" | "all";
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  year?: string;
};

export function FilterBar({
  values,
  categories,
  zones,
  claimants,
  initiallyUnset = false,
  placement = "default",
}: {
  values: FilterValues;
  categories: Option[];
  zones: Option[];
  claimants: Option[];
  initiallyUnset?: boolean;
  placement?: "default" | "hero";
}) {
  const activeFilterCount =
    [values.search, values.status, values.categoryId, values.zoneId, values.urgency, values.claimantId].filter(Boolean).length +
    Number(!initiallyUnset);

  return (
    <details className={`group ${placement === "hero" ? "xl:static" : ""}`} data-testid="work-filter-bar">
      <summary className="ml-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden="true" size={17} />
        ตัวกรอง
        {activeFilterCount ? (
          <span className="grid size-6 place-items-center rounded-full bg-white/20 text-[11px]">
            {activeFilterCount}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className="transition-transform duration-200 group-open:rotate-180"
          size={16}
        />
      </summary>

      <form
        className={
          placement === "hero"
            ? "mt-4 w-[calc(100vw-2.5rem)] pt-4 md:w-[calc(100vw-var(--app-sidebar-width,18rem)-4rem)] xl:absolute xl:right-0 xl:top-full xl:z-50"
            : "mt-4 pt-4"
        }
        method="get"
      >
      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <label className="grid gap-1 text-sm">
          <span className="text-[var(--muted)]">Search</span>
          <span className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3">
            <Search size={16} className="text-[var(--muted)]" />
            <input
              className="min-w-0 flex-1 bg-transparent py-3 outline-none"
              defaultValue={values.search ?? ""}
              name="search"
              placeholder="Search CM number, machine, requester"
            />
          </span>
        </label>
        <SelectFilter label="Status" name="status" value={values.status} options={Object.values(WorkStatus).map((status) => ({ id: status, name: statusLabels[status] }))} />
        <SelectFilter label="Category" name="categoryId" value={values.categoryId} options={categories} />
        <SelectFilter label="Zone" name="zoneId" value={values.zoneId} options={zones} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto_auto] xl:items-end">
        <SelectFilter label="Urgency" name="urgency" value={values.urgency} options={Object.values(Urgency).map((urgency) => ({ id: urgency, name: urgencyLabels[urgency] }))} />
        <SelectFilter label="Claimant" name="claimantId" value={values.claimantId} options={claimants} />
        <CmDateFilterBar
          defaultDate={values.date}
          defaultEndDate={values.endDate}
          defaultMode={values.mode}
          defaultMonth={values.month}
          defaultStartDate={values.startDate}
          defaultYear={values.year}
          initiallyUnset={initiallyUnset}
        />
        <button className="self-end rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white" type="submit">
          ใช้ตัวกรอง
        </button>
        <Link className="self-end rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold" href="/work">
          ล้างตัวกรอง
        </Link>
      </div>
      </form>
    </details>
  );
}

function SelectFilter({ label, name, value, options }: { label: string; name: string; value?: string; options: Option[] }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <AutoSubmitSelect
        className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none"
        defaultValue={value ?? ""}
        name={name}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </AutoSubmitSelect>
    </label>
  );
}
