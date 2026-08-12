import { Archive, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { requireUser } from "../../lib/session";

type InventoryPlaceholderPageProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  steps?: string[];
};

export async function InventoryPlaceholderPage({
  title,
  eyebrow = "Store Inventory",
  description = "ระบบ Store / Inventory กำลังเตรียมพร้อมสำหรับการใช้งาน หน้านี้เปิดไว้เพื่อรองรับเมนูและสิทธิ์ของ Store Officer โดยยังไม่มีการบันทึกหรือเปลี่ยนแปลงข้อมูล",
  steps = ["กำหนดข้อมูลหลักของคลังและอะไหล่", "รองรับการรับเข้าและปรับยอด", "รองรับการเบิกพร้อมขั้นตอนอนุมัติ"],
}: InventoryPlaceholderPageProps) {
  await requireUser();

  return (
    <AppShell>
      <section className="space-y-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
              <Archive size={16} />
              {eyebrow}
            </p>
            <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              The Store module is being prepared. This page is a safe placeholder for navigation and permissions, with no inventory data changes yet.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-sm font-bold text-[var(--primary)]">
            Foundation phase
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                {index === 0 ? (
                  <CheckCircle2 size={17} className="text-[var(--primary)]" />
                ) : (
                  <Clock3 size={17} className="text-[var(--muted)]" />
                )}
                Step {index + 1}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
