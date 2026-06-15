import { AlertTriangle, BarChart3, CheckCircle2, CircleDot, ClipboardList, Factory, Flame, Gauge, History, Wrench } from "lucide-react";
import { AppShell } from "../../components/app-shell";

const statusRows = [
  { label: "แจ้งใหม่", value: 45, color: "#3b82f6" },
  { label: "รอรับงาน", value: 7, color: "#f59e0b" },
  { label: "รับเรื่องแล้ว", value: 6, color: "#14b8a6" },
  { label: "กำลังดำเนินการ", value: 6, color: "#8b5cf6" },
  { label: "รอปิดงาน", value: 7, color: "#ef4444" },
  { label: "ปิดงานแล้ว", value: 8, color: "#22c55e" },
  { label: "ยกเลิก", value: 6, color: "#64748b" },
];

const monthlyRows = [
  { month: "Jan", total: 8, open: 4, pending: 2 },
  { month: "Feb", total: 12, open: 6, pending: 3 },
  { month: "Mar", total: 18, open: 10, pending: 4 },
  { month: "Apr", total: 22, open: 12, pending: 5 },
  { month: "May", total: 28, open: 18, pending: 5 },
  { month: "Jun", total: 44, open: 30, pending: 6 },
];

const zoneRows = [
  { label: "Boiler & Combustion", value: 24, color: "#ef4444" },
  { label: "Turbine", value: 18, color: "#f59e0b" },
  { label: "Fuel preparation", value: 14, color: "#3b82f6" },
  { label: "ESP", value: 10, color: "#14b8a6" },
  { label: "Water Treatment Plant", value: 8, color: "#8b5cf6" },
];

const priorityWorks = [
  { number: "CM-2026-06-9034", machine: "Boiler FD Fan", zone: "Boiler & Combustion", tag: "Critical", color: "#ef4444" },
  { number: "CM-2026-06-9031", machine: "Fuel Conveyor BC-01", zone: "Fuel preparation", tag: "Waiting Close", color: "#f59e0b" },
  { number: "CM-2026-06-9025", machine: "Turbine Lube Oil Pump", zone: "Turbine", tag: "In Progress", color: "#14b8a6" },
];

export default function DashboardV2MockupPage() {
  const totalStatus = statusRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <AppShell>
      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold text-[var(--primary)]">
              <Factory size={17} />
              CM Operations Dashboard V2 Mockup
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-normal">ภาพรวมงานซ่อม โรงไฟฟ้า รุ่งทิวา ไบโอแมส จำกัด</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">หน้าตัวอย่างแนว Clean Dashboard + Operation Command Center สำหรับดูสถานะ งานเร่งด่วน โซน และแนวโน้มรายเดือนในหน้าเดียว</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-right text-sm">
            <p className="font-semibold">อัปเดตล่าสุด</p>
            <p className="text-[var(--muted)]">09/06/2026 22:30</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total CM" value="90" note="งานซ่อมทั้งหมด" icon={<ClipboardList size={34} />} color="#3b82f6" />
        <KpiCard label="Open Work" value="58" note="ยังไม่ปิดงาน" icon={<Wrench size={34} />} color="#14b8a6" />
        <KpiCard label="Critical / Urgent" value="12" note="ต้องติดตามก่อน" icon={<AlertTriangle size={34} />} color="#ef4444" />
        <KpiCard label="Closed Rate" value="32%" note="ปิดงานแล้ว" icon={<CheckCircle2 size={34} />} color="#8b5cf6" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Status Overview" icon={<CircleDot size={22} className="text-[#3b82f6]" />} aside={`${totalStatus} jobs`}>
          <div className="grid gap-7 lg:grid-cols-[300px_1fr] lg:items-center">
            <Donut rows={statusRows} total={totalStatus} centerLabel="Total CM" />
            <Legend rows={statusRows} total={totalStatus} />
          </div>
        </Panel>

        <Panel title="Monthly CM Trend" icon={<BarChart3 size={22} className="text-[#14b8a6]" />} aside="6-month view">
          <div className="mt-3 grid min-h-72 grid-cols-6 items-end gap-5">
            {monthlyRows.map((row) => (
              <MonthlyBar key={row.month} row={row} max={44} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Plant Zone Workload" icon={<Factory size={22} className="text-[#f59e0b]" />} aside="Top zones">
          <div className="mt-4 grid gap-4">
            {zoneRows.map((row) => (
              <div key={row.label} className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-[var(--soft)]">
                  <div className="h-full rounded-full" style={{ width: `${(row.value / 24) * 100}%`, backgroundColor: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Priority Work Queue" icon={<Flame size={22} className="text-[#ef4444]" />} aside="Action first">
          <div className="mt-4 grid gap-4">
            {priorityWorks.map((work) => (
              <div key={work.number} className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="text-lg">{work.number}</strong>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {work.machine} - {work.zone}
                    </p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: work.color }}>
                    {work.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <MiniPanel label="Category Split" value="68%" note="Mechanical work share" color="#f59e0b" />
        <MiniPanel label="Average Close Time" value="2.8d" note="จากงานที่ปิดแล้ว" color="#14b8a6" />
        <MiniPanel label="Waiting Close" value="7" note="พร้อมตรวจรับ/ปิดงาน" color="#ef4444" />
      </section>
    </AppShell>
  );
}

function KpiCard({ label, value, note, icon, color }: { label: string; value: string; note: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-[var(--shadow)]" style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 78%, white))` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white/80">{label}</p>
          <strong className="mt-2 block text-4xl">{value}</strong>
        </div>
        <div className="text-white/75">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-white/80">{note}</p>
    </div>
  );
}

function Panel({ title, icon, aside, children }: { title: string; icon: React.ReactNode; aside: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-2xl font-bold">
          {icon}
          {title}
        </h2>
        <span className="text-sm text-[var(--muted)]">{aside}</span>
      </div>
      {children}
    </section>
  );
}

function Donut({ rows, total, centerLabel }: { rows: typeof statusRows; total: number; centerLabel: string }) {
  let current = 0;
  const parts = rows.map((row) => {
    const start = current;
    current += (row.value / total) * 100;
    return `${row.color} ${start}% ${current}%`;
  });

  return (
    <div className="mx-auto mt-6 grid h-64 w-64 place-items-center rounded-full" style={{ background: `conic-gradient(${parts.join(", ")})` }}>
      <div className="grid h-36 w-36 place-items-center rounded-full bg-[var(--surface)] text-center shadow-sm">
        <span>
          <small className="block text-xs text-[var(--muted)]">{centerLabel}</small>
          <strong className="block text-4xl">{total}</strong>
        </span>
      </div>
    </div>
  );
}

function Legend({ rows, total }: { rows: typeof statusRows; total: number }) {
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <i className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="truncate">{row.label}</span>
          </span>
          <strong>
            {row.value} - {Math.round((row.value / total) * 100)}%
          </strong>
        </div>
      ))}
    </div>
  );
}

function MonthlyBar({ row, max }: { row: (typeof monthlyRows)[number]; max: number }) {
  const totalHeight = Math.max(24, Math.round((row.total / max) * 190));
  const pendingHeight = Math.round((row.pending / row.total) * totalHeight);
  const openHeight = Math.round((row.open / row.total) * totalHeight);
  const otherHeight = totalHeight - pendingHeight - openHeight;

  return (
    <div className="grid h-72 grid-rows-[1fr_auto_auto] items-end gap-2 text-center">
      <div className="mx-auto grid h-56 w-20 grid-cols-[18px_18px] items-end justify-center gap-3 rounded-2xl bg-[var(--soft)] pb-0">
        <span className="w-[18px] rounded-t-md bg-[#3b82f6]" style={{ height: totalHeight }} />
        <span className="flex w-[18px] flex-col-reverse overflow-hidden rounded-t-md bg-[var(--line)]" style={{ height: totalHeight }}>
          <i className="block bg-[#f59e0b]" style={{ height: openHeight }} />
          <i className="block bg-[#ef4444]" style={{ height: pendingHeight }} />
          <i className="block bg-[#14b8a6]" style={{ height: otherHeight }} />
        </span>
      </div>
      <strong className="text-xs">{row.total}</strong>
      <span className="text-xs text-[var(--muted)]">{row.month} 2026</span>
    </div>
  );
}

function MiniPanel({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">{label}</p>
        <Gauge size={20} style={{ color }} />
      </div>
      <strong className="mt-4 block text-4xl" style={{ color }}>
        {value}
      </strong>
      <p className="mt-2 text-sm text-[var(--muted)]">{note}</p>
    </section>
  );
}
