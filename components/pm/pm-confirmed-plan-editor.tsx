import { CalendarClock, Plus, XCircle } from "lucide-react";

type AssetOption = { id: string; code: string | null; nameTh: string };
type Action = (data: FormData) => void | Promise<void>;

export function PmConfirmedPlanEditor({ plan, assets, scope, calendarView = "month", actions }: {
  plan: { id: string; number: string | null; plannedDateKey: string; status: string; works?: Array<{ id: string; status: string; assetId: string }> };
  assets: AssetOption[];
  scope: { organizationId: string; plantId: string };
  calendarView?: "month" | "day";
  actions: { reschedule: Action; cancel: Action; addAsset: Action };
}) {
  const hidden = <><input name="organizationId" type="hidden" value={scope.organizationId} /><input name="plantId" type="hidden" value={scope.plantId} /><input name="planId" type="hidden" value={plan.id} /><input name="currentDate" type="hidden" value={plan.plannedDateKey} /><input name="calendarView" type="hidden" value={calendarView} /></>;
  const allPlanned = Boolean(plan.works?.length) && plan.works!.every(work => work.status === "PLANNED");
  return <aside aria-label="จัดการแผน PM ที่ยืนยันแล้ว" className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
    <p className="text-sm font-bold text-[var(--primary)]">Confirmed PM Plan</p><h2 className="mt-1 text-2xl font-extrabold">{plan.number}</h2><p className="mt-2 text-sm text-[var(--muted)]">{plan.plannedDateKey} · {plan.works?.length ?? 0} works</p>
    {!allPlanned ? <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800">แผนนี้มีงานที่เริ่มแล้ว จึงย้ายวันหรือยกเลิกทั้งแผนไม่ได้</p> : null}
    <form action={actions.addAsset} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">{hidden}<h3 className="font-extrabold">เพิ่ม Asset หลังยืนยัน</h3><label className="grid gap-1 text-sm font-bold">Asset<select aria-label="Asset to add" className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3" disabled={!assets.length} name="assetId" required><option value="">เลือก Asset</option>{assets.map(asset => <option key={asset.id} value={asset.id}>{asset.code ?? "—"} · {asset.nameTh}</option>)}</select></label><label className="grid gap-1 text-sm font-bold">เหตุผล<input className="min-h-12 rounded-xl border border-[var(--line)] px-3" name="reason" required /></label><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 font-bold text-white" disabled={!assets.length}><Plus size={18} />เพิ่ม Asset</button></form>
    <form action={actions.reschedule} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">{hidden}<h3 className="font-extrabold">ย้ายวันแผน</h3><label className="grid gap-1 text-sm font-bold">วันที่ใหม่<input className="min-h-12 rounded-xl border border-[var(--line)] px-3" defaultValue={plan.plannedDateKey} disabled={!allPlanned} name="plannedDateKey" required type="date" /></label><label className="grid gap-1 text-sm font-bold">เหตุผล<input className="min-h-12 rounded-xl border border-[var(--line)] px-3" disabled={!allPlanned} name="reason" required /></label><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 font-bold" disabled={!allPlanned}><CalendarClock size={18} />ย้ายวัน</button></form>
    <form action={actions.cancel} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">{hidden}<h3 className="font-extrabold text-red-700">ยกเลิกทั้งแผน</h3><label className="grid gap-1 text-sm font-bold">เหตุผลการยกเลิก<input className="min-h-12 rounded-xl border border-red-500/40 px-3" disabled={!allPlanned} name="reason" required /></label><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/40 px-4 font-bold text-red-700" disabled={!allPlanned}><XCircle size={18} />ยกเลิกแผน</button></form>
  </aside>;
}
