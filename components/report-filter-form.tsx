 "use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { Urgency, WorkStatus, statusLabels, urgencyLabels } from "../modules/cm-work/cm-work-types";
import type { ReportFilter } from "../modules/reports/report-filter";
import { AutoSubmitSelect } from "./auto-submit-select";
import { CmDateFilterBar } from "./cm-date-filter-bar";

type Option = { id: string; name: string };

export function ReportFilterForm({
  action = "/reports",
  clearHref = "/reports",
  filter,
  categories,
  zones,
  claimants,
}: {
  action?: string;
  clearHref?: string;
  filter: ReportFilter;
  categories: Option[];
  zones: Option[];
  claimants: Option[];
}) {
  return (
    <form action={action} className="border-b border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5" method="get">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextFilter icon={Search} label="CM Number" name="number" placeholder="CM-2026-06-0001" value={filter.number} />
        <TextFilter label="Machine Name" name="machineName" placeholder="Pump, fan, conveyor" value={filter.machineName} />
        <TextFilter label="Requester" name="requester" placeholder="Requester name" value={filter.requester} />
        <TextFilter label="Department" name="department" placeholder="Operations" value={filter.department} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SelectFilter
          label="Status"
          name="status"
          options={Object.values(WorkStatus).map((status) => ({ id: status, name: statusLabels[status] }))}
          value={filter.status}
        />
        <SelectFilter label="Category" name="categoryId" options={categories} value={filter.categoryId} />
        <SelectFilter label="Zone" name="zoneId" options={zones} value={filter.zoneId} />
        <SelectFilter
          label="Urgency"
          name="urgency"
          options={Object.values(Urgency).map((urgency) => ({ id: urgency, name: urgencyLabels[urgency] }))}
          value={filter.urgency}
        />
        <SelectFilter label="Claimant" name="claimantId" options={claimants} value={filter.claimantId} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.7fr_auto_auto] xl:items-end">
        <CmDateFilterBar
          defaultDate={filter.dateInput.date}
          defaultEndDate={filter.dateInput.endDate}
          defaultMode={filter.dateInput.mode}
          defaultMonth={filter.dateInput.month}
          defaultStartDate={filter.dateInput.startDate}
          defaultYear={filter.dateInput.year}
        />
        <button className="min-h-[52px] rounded-2xl bg-[var(--primary)] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]" type="submit">
          Preview report
        </button>
        <Link className="flex min-h-[52px] items-center justify-center rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-semibold hover:bg-[var(--soft)]" href={clearHref}>
          Clear filters
        </Link>
      </div>
    </form>
  );
}

function TextFilter({
  icon: Icon,
  label,
  name,
  placeholder,
  value,
}: {
  icon?: typeof Search;
  label: string;
  name: string;
  placeholder: string;
  value?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3">
        {Icon ? <Icon aria-hidden="true" className="shrink-0 text-[var(--muted)]" size={17} /> : null}
        <input aria-label={label} className="min-w-0 flex-1 bg-transparent py-3 outline-none" defaultValue={value ?? ""} name={name} placeholder={placeholder} />
      </span>
    </label>
  );
}

function SelectFilter({ label, name, options, value }: { label: string; name: string; options: Option[]; value?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      <span className="text-[var(--muted)]">{label}</span>
      <AutoSubmitSelect
        aria-label={label}
        className="min-h-[52px] rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 py-3 outline-none"
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
