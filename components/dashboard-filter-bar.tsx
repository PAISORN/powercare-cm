"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { AutoSubmitSelect } from "./auto-submit-select";
import { CmDateFilterBar } from "./cm-date-filter-bar";
import type { DashboardCategoryFilter } from "../modules/dashboard/dashboard-query";
import type { CmDateFilterInput } from "../modules/filters/cm-date-filter";

const categoryOptions: {
  value: "" | DashboardCategoryFilter;
  label: string;
}[] = [
  { value: "", label: "Overview - All CM Work" },
  { value: "mechanical", label: "Mechanical - Mechanical Work" },
  { value: "electrical", label: "Electrical - Electrical Work" },
];

export function DashboardFilterBar({
  activeCategory,
  activeDateFilter,
  clearHref,
  placement = "default",
  preservedParams,
}: {
  activeCategory?: DashboardCategoryFilter;
  activeDateFilter?: CmDateFilterInput;
  clearHref: string;
  placement?: "default" | "hero";
  preservedParams?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeFilterCount =
    Number(Boolean(activeCategory)) + Number(Boolean(activeDateFilter));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preservedParams ?? {})) {
      if (value) params.set(key, value);
    }
    for (const key of [
      "category",
      "mode",
      "date",
      "startDate",
      "endDate",
      "month",
      "year",
    ]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <details
      className={`group ${placement === "hero" ? "lg:static" : ""}`}
      data-testid="dashboard-filter-bar"
    >
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
            ? "mt-4 pt-4 lg:absolute lg:right-0 lg:top-full lg:z-50 lg:w-[min(1100px,calc(100vw-2rem))]"
            : "mt-4 border-t border-[var(--line)] pt-4"
        }
        method="get"
        onSubmit={applyFilters}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1.4fr_auto_auto] xl:items-end">
          <SelectField
            label="ประเภทงาน"
            name="category"
            value={activeCategory ?? ""}
            options={categoryOptions}
          />
          <CmDateFilterBar
            defaultMode={activeDateFilter?.mode}
            defaultDate={activeDateFilter?.date}
            defaultStartDate={activeDateFilter?.startDate}
            defaultEndDate={activeDateFilter?.endDate}
            defaultMonth={activeDateFilter?.month}
            defaultYear={activeDateFilter?.year}
            initiallyUnset={!activeDateFilter}
          />
          <button
            className="min-h-[52px] rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
            type="submit"
          >
            ใช้ตัวกรอง
          </button>
          <Link
            className="min-h-[52px] rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold hover:bg-[var(--soft)]"
            href={clearHref}
          >
            ล้างตัวกรอง
          </Link>
        </div>
      </form>
    </details>
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
      <AutoSubmitSelect
        className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none"
        defaultValue={value}
        name={name}
      >
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </AutoSubmitSelect>
    </label>
  );
}
