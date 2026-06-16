import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { PublicHeader } from "../../components/public-header";
import { getActiveCategories, getActiveZones } from "../../lib/query-cache";
import { getCurrentUser } from "../../lib/session";
import { repairRequestSchema } from "../../lib/validation";
import { createRepairRequest } from "../../modules/cm-work/cm-work-service";

async function submitRepairRequest(formData: FormData) {
  "use server";
  const parsed = repairRequestSchema.parse({
    requesterName: formData.get("requesterName"),
    requesterDepartment: formData.get("requesterDepartment"),
    categoryId: formData.get("categoryId"),
    zoneId: formData.get("zoneId"),
    machineName: formData.get("machineName"),
    problemTitle: formData.get("problemTitle"),
    problemDetail: formData.get("problemDetail"),
    urgency: formData.get("urgency"),
  });

  const work = await createRepairRequest(parsed);
  redirect(`/request/success/${work.number}`);
}

export default async function RequestPage() {
  const user = await getCurrentUser();
  const [categories, zones] = await Promise.all([getActiveCategories(), getActiveZones()]);

  return (
    <RequestShell signedIn={Boolean(user)}>
      <form action={submitRepairRequest} className="mx-auto grid max-w-3xl gap-4 px-8 py-10">
        <h1 className="text-3xl font-bold">แจ้งซ่อม</h1>
        <input name="requesterName" required placeholder="ชื่อผู้แจ้ง" className="rounded-md border p-3 text-black" />
        <input name="requesterDepartment" required placeholder="หน่วยงาน/แผนก" className="rounded-md border p-3 text-black" />
        <select name="categoryId" required className="rounded-md border p-3 text-black">
          <option value="">เลือก Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select name="zoneId" required className="rounded-md border p-3 text-black">
          <option value="">เลือก Zone</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
        <input name="machineName" required placeholder="ชื่อเครื่องจักร" className="rounded-md border p-3 text-black" />
        <input name="problemTitle" required placeholder="หัวข้อปัญหา" className="rounded-md border p-3 text-black" />
        <textarea name="problemDetail" required placeholder="รายละเอียดปัญหา" className="min-h-32 rounded-md border p-3 text-black" />
        <select name="urgency" required className="rounded-md border p-3 text-black">
          <option value="NORMAL">ปกติ</option>
          <option value="URGENT">เร่งด่วน</option>
          <option value="CRITICAL">วิกฤต</option>
        </select>
        <button className="rounded-md bg-[var(--primary)] px-5 py-3 text-white" type="submit">
          ส่งแจ้งซ่อม
        </button>
      </form>
    </RequestShell>
  );
}

function RequestShell({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  if (signedIn) return <AppShell>{children}</AppShell>;

  return (
    <main>
      <PublicHeader />
      {children}
    </main>
  );
}
