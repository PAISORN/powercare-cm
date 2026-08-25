import Link from "next/link";
import type { PmWorkFilter } from "../../modules/pm/pm-filter";

type Option = { id: string; label: string };
export function PmFilterBar({ filter, scope, groups, assets, assignees }: { filter: PmWorkFilter; scope: { organizationId: string; plantId: string }; groups: Option[]; assets: Option[]; assignees: Option[] }) {
  const clear = `/dashboardpm/work?${new URLSearchParams(scope)}`;
  return <form action="/dashboardpm/work" className="min-w-0 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" method="get">
    <input name="organizationId" type="hidden" value={scope.organizationId} /><input name="plantId" type="hidden" value={scope.plantId} />
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label="ตั้งแต่"><input className={control} defaultValue={filter.startDate} name="startDate" type="date" /></Field>
      <Field label="ถึง"><input className={control} defaultValue={filter.endDate} name="endDate" type="date" /></Field>
      <Select label="PM Group" name="groupId" value={filter.groupId} options={groups} />
      <Select label="Asset" name="assetId" value={filter.assetId} options={assets} />
      <Select label="ผู้รับผิดชอบ" name="assigneeId" value={filter.assigneeId} options={assignees} />
      <Select label="สถานะ" name="lifecycle" value={filter.lifecycle} options={[{ id: "PLANNED", label: "Planned" }, { id: "IN_PROGRESS", label: "In Progress" }, { id: "COMPLETED", label: "Completed" }, { id: "CANCELED", label: "Canceled" }]} />
      <Select label="ผล PM" name="result" value={filter.result} options={[{ id: "NORMAL", label: "Normal" }, { id: "ABNORMAL", label: "Abnormal" }]} />
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-sm font-bold"><input defaultChecked={filter.overdue} name="overdue" type="checkbox" value="1" />Overdue เท่านั้น</label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white">ใช้ตัวกรอง</button><Link className="min-h-12 rounded-2xl border border-[var(--line)] px-5 py-3 text-center font-bold" href={clear}>ล้างตัวกรอง</Link></div>
  </form>;
}
const control = "min-h-12 min-w-0 w-full rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid min-w-0 gap-1 text-sm font-bold"><span className="text-[var(--muted)]">{label}</span>{children}</label>; }
function Select({ label, name, value, options }: { label: string; name: string; value?: string; options: Option[] }) { return <Field label={label}><select className={control} defaultValue={value ?? ""} name={name}><option value="">ทั้งหมด</option>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>; }
