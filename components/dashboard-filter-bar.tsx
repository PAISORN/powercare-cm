"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { DashboardCategoryFilter, DashboardTimeRangeFilter } from "../modules/dashboard/dashboard-query";

const categoryOptions: { value: "" | DashboardCategoryFilter; label: string }[] = [
  { value: "", label: "Overview - All CM Work" },
  { value: "mechanical", label: "Mechanical - Mechanical Work" },
  { value: "electrical", label: "Electrical - Electrical Work" },
];

const timeRangeOptions: { value: "" | DashboardTimeRangeFilter; label: string }[] = [
  { value: "", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "last-6-months", label: "Last 6 Months" },
];

export function DashboardFilterBar({
  activeCategory,
  activeTimeRange,
  clearHref,
}: {
  activeCategory?: DashboardCategoryFilter;
  activeTimeRange?: DashboardTimeRangeFilter;
  clearHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const category = String(formData.get("category") ?? "");
    const timeRange = String(formData.get("timeRange") ?? "");

    if (category) params.set("category", category);
    if (timeRange) params.set("timeRange", timeRange);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" data-testid="dashboard-filter-bar" method="get" onSubmit={applyFilters}>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <SelectField label="Work Category" name="category" value={activeCategory ?? ""} options={categoryOptions} />
        <SelectField label="Time Range" name="timeRange" value={activeTimeRange ?? ""} options={timeRangeOptions} />
        <button className="rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]" type="submit">
          Apply filters
        </button>
        <Link className="rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold hover:bg-[var(--soft)]" href={clearHref}>
          Clear
        </Link>
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      <span className="text-[var(--muted)]">{label}</span>
      <select className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none" defaultValue={value} name={name}>
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
