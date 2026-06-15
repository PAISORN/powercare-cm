import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Gauge, History, RotateCcw, Wrench } from "lucide-react";
import { WorkStatus, statusLabels } from "../modules/cm-work/cm-work-types";

type StatusKpiStripProps = {
  statusCountByKey: Map<WorkStatus, number>;
  activeStatus?: string;
  getHref?: (status: WorkStatus) => string;
};

export function StatusKpiStrip({ statusCountByKey, activeStatus, getHref }: StatusKpiStripProps) {
  const icons: Record<WorkStatus, React.ReactNode> = {
    [WorkStatus.NEW]: <ClipboardList size={20} />,
    [WorkStatus.WAITING_TO_CLAIM]: <Activity size={20} />,
    [WorkStatus.CLAIMED]: <Wrench size={20} />,
    [WorkStatus.IN_PROGRESS]: <Gauge size={20} />,
    [WorkStatus.WAITING_TO_CLOSE]: <History size={20} />,
    [WorkStatus.RETURNED_FOR_CORRECTION]: <RotateCcw size={20} />,
    [WorkStatus.CLOSED]: <CheckCircle2 size={20} />,
    [WorkStatus.CANCELED]: <AlertTriangle size={20} />,
  };
  const tones: Record<WorkStatus, "blue" | "amber" | "cyan" | "violet" | "red" | "green" | "slate"> = {
    [WorkStatus.NEW]: "blue",
    [WorkStatus.WAITING_TO_CLAIM]: "amber",
    [WorkStatus.CLAIMED]: "cyan",
    [WorkStatus.IN_PROGRESS]: "violet",
    [WorkStatus.WAITING_TO_CLOSE]: "red",
    [WorkStatus.RETURNED_FOR_CORRECTION]: "red",
    [WorkStatus.CLOSED]: "green",
    [WorkStatus.CANCELED]: "slate",
  };

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8" aria-label="Status KPI strip">
      {Object.values(WorkStatus).map((status) => (
        <MetricCard
          key={status}
          active={activeStatus === status}
          ariaLabel={`Status KPI ${status}`}
          href={getHref?.(status)}
          label={statusLabels[status]}
          value={statusCountByKey.get(status) ?? 0}
          icon={icons[status]}
          tone={tones[status]}
        />
      ))}
    </section>
  );
}

function MetricCard({
  active,
  ariaLabel,
  href,
  label,
  value,
  icon,
  tone,
}: {
  active: boolean;
  ariaLabel: string;
  href?: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "amber" | "cyan" | "violet" | "red" | "green" | "slate";
}) {
  const tones = {
    blue: "bg-[#dff7ff] text-[#07324f]",
    amber: "bg-[#fff0c7] text-[#5a3800]",
    cyan: "bg-[#d8fbf7] text-[#06433f]",
    violet: "bg-[#ede9fe] text-[#3b236f]",
    red: "bg-[#ffe1e1] text-[#681515]",
    green: "bg-[#dcfce7] text-[#073f26]",
    slate: "bg-[#e2e8f0] text-[#1f2937]",
  };
  const className = `rounded-2xl p-4 shadow-[var(--shadow)] transition ${tones[tone]} ${active ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]" : ""}`;
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">{label}</p>
        {icon}
      </div>
      <strong className="mt-3 block text-3xl">{value}</strong>
    </>
  );

  if (href) {
    return (
      <Link className={`${className} hover:-translate-y-0.5 hover:shadow-lg`} href={href} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} aria-label={ariaLabel}>
      {content}
    </div>
  );
}
