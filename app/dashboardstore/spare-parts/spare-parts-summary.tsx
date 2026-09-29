import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Tags,
  Warehouse,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

export function SparePartsSummary({
  activePartCount,
  canViewStockValue,
  categoryCount,
  lowStockPartCount,
  partCount,
  totalPartValue,
}: {
  activePartCount: number;
  canViewStockValue: boolean;
  categoryCount: number;
  lowStockPartCount: number;
  partCount: number;
  totalPartValue: number;
}) {
  return (
    <section className="dashboard-kpi-carousel stock-summary-grid md:grid-cols-3 xl:grid-cols-5">
      <SummaryCard
        color="blue"
        icon={<Boxes size={28} />}
        label="มูลค่าอะไหล่รวม"
        sublabel={canViewStockValue ? "บาท" : "ไม่มีสิทธิ์ดูมูลค่า"}
        value={canViewStockValue ? formatCompactMoney(totalPartValue) : "-"}
      />
      <SummaryCard
        color="green"
        icon={<Warehouse size={28} />}
        label="รายการอะไหล่ทั้งหมด"
        sublabel="รายการ"
        value={formatQuantity(partCount)}
      />
      <SummaryCard
        color="violet"
        icon={<CheckCircle2 size={28} />}
        label="รายการที่เปิดใช้งาน"
        sublabel="รายการ"
        value={formatQuantity(activePartCount)}
      />
      <SummaryCard
        color="orange"
        icon={<AlertTriangle size={28} />}
        label="ถึงหรือต่ำกว่า Min"
        sublabel="รายการ"
        value={formatQuantity(lowStockPartCount)}
      />
      <SummaryCard
        color="red"
        icon={<Tags size={28} />}
        label="หมวดหมู่อะไหล่"
        sublabel="หมวดหมู่"
        value={formatQuantity(categoryCount)}
      />
    </section>
  );
}

function SummaryCard({
  color,
  icon,
  label,
  sublabel,
  value,
}: {
  color: "blue" | "green" | "violet" | "orange" | "red";
  icon: ReactNode;
  label: string;
  sublabel: string;
  value: string;
}) {
  const colors = {
    blue: "#3b82f6",
    green: "#10b981",
    violet: "#8b5cf6",
    orange: "#f59e0b",
    red: "#ef4444",
  };
  return (
    <article
      className="dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide relative min-h-[148px] overflow-hidden rounded-3xl border p-4 shadow-sm sm:p-5"
      style={{ "--kpi-color": colors[color] } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="dashboard-kpi-icon shrink-0">
          {icon}
        </span>
        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
          {sublabel}
        </span>
      </div>
      <p className="mt-5 text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
    </article>
  );
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value);
}
