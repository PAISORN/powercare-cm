"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { CmDateFilterBar } from "./cm-date-filter-bar";
import type { CmDateFilterInput } from "../modules/filters/cm-date-filter";
import type { DashboardCategoryFilter } from "../modules/dashboard/dashboard-query";

const categoryOptions: { value: "" | DashboardCategoryFilter; label: string }[] = [
  { value: "", label: "Overview - All CM Work" },
  { value: "mechanical", label: "Mechanical - Mechanical Work" },
  { value: "electrical", label: "Electrical - Electrical Work" },
];

export function DashboardFilterBar({
  activeCategory,
  activeDateFilter,
  clearHref,
}: {
  activeCategory?: DashboardCategoryFilter;
  activeDateFilter?: CmDateFilterInput;
  clearHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const category = readText(formData, "category");
    const mode = readText(formData, "mode");
    const date = readText(formData, "date");
    const startDate = readText(formData, "startDate");
    const endDate = readText(formData, "endDate");
    const month = readText(formData, "month");
    const year = readText(formData, "year");

    if (category) params.set("category", category);
    if (mode) params.set("mode", mode);
    if (date) params.set("date", date);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (month) params.set("month", month);
    if (year) params.set("year", year);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <form className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" data-testid="dashboard-filter-bar" method="get" onSubmit={applyFilters}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1.4fr_auto_auto] xl:items-end">
        <SelectField label="Work Category" name="category" value={activeCategory ?? ""} options={categoryOptions} />
        <CmDateFilterBar
          defaultMode={activeDateFilter?.mode}
          defaultDate={activeDateFilter?.date}
          defaultStartDate={activeDateFilter?.startDate}
          defaultEndDate={activeDateFilter?.endDate}
          defaultMonth={activeDateFilter?.month}
          defaultYear={activeDateFilter?.year}
          initiallyUnset={!activeDateFilter}
        />
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
      <select className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none" defaultValue={value} name={name}>
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
