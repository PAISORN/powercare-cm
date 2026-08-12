"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { AutoSubmitSelect } from "./auto-submit-select";
import { CmDateFilterBar } from "./cm-date-filter-bar";
import type { DashboardCategoryFilter } from "../modules/dashboard/dashboard-query";
import type { CmDateFilterInput } from "../modules/filters/cm-date-filter";

const categoryOptions: { value: "" | DashboardCategoryFilter; label: string }[] = [
  { value: "", label: "Overview - All CM Work" },
  { value: "mechanical", label: "Mechanical - Mechanical Work" },
  { value: "electrical", label: "Electrical - Electrical Work" },
];

export function DashboardFilterBar({
  activeCategory,
  activeDateFilter,
  clearHref,
  showStoreDashboard,
}: {
  activeCategory?: DashboardCategoryFilter;
  activeDateFilter?: CmDateFilterInput;
  clearHref: string;
  showStoreDashboard: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["category", "mode", "date", "startDate", "endDate", "month", "year"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <form className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" data-testid="dashboard-filter-bar" method="get" onSubmit={applyFilters}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-[var(--muted)]">ประเภท Dashboard</span>
        <div aria-label="ประเภท Dashboard" className="inline-flex rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-1" role="tablist">
          <button aria-selected="true" className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-extrabold text-white shadow-sm" role="tab" type="button">CM</button>
          <button aria-disabled="true" className="min-h-11 cursor-not-allowed rounded-xl px-5 text-sm font-extrabold text-[var(--muted)] opacity-60" disabled role="tab" type="button">PM</button>
          {showStoreDashboard ? <Link aria-selected="false" className="min-h-11 rounded-xl px-5 py-3 text-sm font-extrabold text-[var(--muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]" href="/dashboardstore" role="tab">Store</Link> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1.4fr_auto_auto] xl:items-end">
        <SelectField label="Work Category" name="category" value={activeCategory ?? ""} options={categoryOptions} />
        <CmDateFilterBar defaultMode={activeDateFilter?.mode} defaultDate={activeDateFilter?.date} defaultStartDate={activeDateFilter?.startDate} defaultEndDate={activeDateFilter?.endDate} defaultMonth={activeDateFilter?.month} defaultYear={activeDateFilter?.year} initiallyUnset={!activeDateFilter} />
        <button className="rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]" type="submit">Apply filters</button>
        <Link className="rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold hover:bg-[var(--soft)]" href={clearHref}>Clear</Link>
      </div>
    </form>
  );
}

function SelectField({ label, name, value, options }: { label: string; name: string; value: string; options: { value: string; label: string }[] }) {
  return <label className="grid gap-1 text-sm font-semibold"><span className="text-[var(--muted)]">{label}</span><AutoSubmitSelect className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none" defaultValue={value} name={name}>{options.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}</AutoSubmitSelect></label>;
}
