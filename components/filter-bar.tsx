 "use client";

import Link from "next/link";
import { Search } from "lucide-react";
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
}: {
  values: FilterValues;
  categories: Option[];
  zones: Option[];
  claimants: Option[];
  initiallyUnset?: boolean;
}) {
  return (
    <form className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" method="get">
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
          Filter
        </button>
        <Link className="self-end rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold" href="/work">
          Clear filters
        </Link>
      </div>
    </form>
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
