import Link from "next/link";
import { updateWorkFromListAction } from "../../app/work/actions";
import { urgencyLabels } from "../../modules/cm-work/cm-work-types";
import type { WorkListPageData } from "../../modules/cm-work/work-list-page-data";

const labelClass = "grid gap-1.5 text-sm font-bold text-[var(--ink)]";
const inputClass = "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

type WorkEditDrawerProps = Pick<
  WorkListPageData,
  "editAssets" | "editCategories" | "editWork" | "editZones" | "returnTo"
>;

export function WorkEditDrawer({
  editAssets,
  editCategories,
  editWork,
  editZones,
  returnTo,
}: WorkEditDrawerProps) {
  if (!editWork) return null;
  const closeHref = `${returnTo}#work-row-${editWork.id}`;
  return (
    <>
      <Link
        aria-label="ปิดหน้าต่างแก้ไขใบแจ้งซ่อม"
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        href={closeHref}
        scroll={false}
      />
      <aside
        aria-labelledby="edit-work-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7"
        id="edit-work-drawer"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <p className="text-sm font-bold text-[var(--primary)]">Edit Repair Request</p>
            <h2 className="mt-1 text-2xl font-extrabold" id="edit-work-title">
              {editWork.number}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">ทุกการเปลี่ยนแปลงถูกบันทึกใน Audit Log</p>
          </div>
          <Link className="rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold" href={closeHref} scroll={false}>ปิด</Link>
        </div>
        <form action={updateWorkFromListAction} className="mt-5 grid gap-4">
          <input name="workId" type="hidden" value={editWork.id} />
          <input name="returnTo" type="hidden" value={`${returnTo}#work-row-${editWork.id}`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อผู้แจ้ง"><input className={inputClass} defaultValue={editWork.requesterName} maxLength={120} name="requesterName" required /></Field>
            <Field label="หน่วยงาน / แผนก"><input className={inputClass} defaultValue={editWork.requesterDepartment} maxLength={120} name="requesterDepartment" required /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category"><select className={inputClass} defaultValue={editWork.categoryId} name="categoryId" required>{editCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Zone"><select className={inputClass} defaultValue={editWork.zoneId} name="zoneId" required>{editZones.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          </div>
          <Field label="เชื่อมกับทะเบียน Asset (ไม่บังคับ)">
            <select className={inputClass} defaultValue={editWork.assetId ?? ""} name="assetId">
              <option value="">ไม่เชื่อมทะเบียน Asset</option>
              {editAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code ?? "—"} · {asset.nameEn?.trim() || asset.nameTh}{asset.zoneId ? ` · ${editZones.find((zone) => zone.id === asset.zoneId)?.name ?? ""}` : ""}</option>)}
            </select>
          </Field>
          <Field label="ชื่อเครื่องจักร"><input className={inputClass} defaultValue={editWork.machineName} maxLength={200} name="machineName" required /></Field>
          <Field label="หัวข้อปัญหา"><input className={inputClass} defaultValue={editWork.problemTitle} maxLength={200} name="problemTitle" required /></Field>
          <Field label="รายละเอียดปัญหา"><textarea className={`${inputClass} min-h-32 py-3`} defaultValue={editWork.problemDetail} maxLength={4000} name="problemDetail" required /></Field>
          <Field label="สถานะความเร่งด่วน"><select className={inputClass} defaultValue={editWork.urgency} name="urgency" required>{Object.entries(urgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-end gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:-mx-7 sm:px-7">
            <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] px-5 font-bold" href={closeHref} scroll={false}>ยกเลิก</Link>
            <button className="min-h-12 rounded-xl bg-[var(--primary)] px-6 font-extrabold text-white transition hover:bg-[var(--primary-strong)]" type="submit">บันทึกการแก้ไข</button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={labelClass}>{label}{children}</label>;
}
