import { randomUUID } from "node:crypto";
import { permanentRedirect, redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { PublicHeader } from "../../components/public-header";
import { RequestSubmitButton } from "../../components/request-submit-button";
import { RequestAssetFields } from "../../components/request-asset-fields";
import { getCurrentUser } from "../../lib/session";
import { db } from "../../lib/db";
import { repairRequestSchema } from "../../lib/validation";
import { createRepairRequest } from "../../modules/cm-work/cm-work-service";
import { RoleName } from "../../modules/cm-work/cm-work-types";
import { readRequestPlantScope } from "../../modules/organization/plant-request-scope";

async function submitRepairRequest(formData: FormData) {
  "use server";
  const currentUser = await getCurrentUser();
  if (currentUser?.role === RoleName.ADMIN) redirect("/dashboardcm");
  const parsed = repairRequestSchema.parse({
    requesterName: formData.get("requesterName"),
    requesterDepartment: formData.get("requesterDepartment"),
    categoryId: formData.get("categoryId"),
    zoneId: formData.get("zoneId"),
    machineName: formData.get("machineName") || (formData.get("assetId") ? "Selected asset" : ""),
    problemTitle: formData.get("problemTitle"),
    problemDetail: formData.get("problemDetail"),
    urgency: formData.get("urgency"),
  });

  const submittedPlantCode = String(formData.get("plantCode") ?? "") || null;
  const plantCode = currentUser?.plant?.code ?? submittedPlantCode;
  const requestPath = plantCode
    ? `/p/${encodeURIComponent(plantCode.toLowerCase())}/request`
    : "/p/rtb/request";
  const submissionKey = String(formData.get("submissionKey") ?? "");
  let work;
  try {
    const assetId = String(formData.get("assetId") || "") || null;
    work = assetId
      ? await createRepairRequest({ ...parsed, plantCode, submissionKey, assetId })
      : await createRepairRequest({ ...parsed, plantCode, submissionKey });
  } catch (error) {
    if (error instanceof Error && error.message === "SITE_REQUEST_LIMIT_REACHED") {
      redirect(`${requestPath}?error=site-limit`);
    }
    throw error;
  }
  redirect(`/request/success/${work.number}?plant=${encodeURIComponent(plantCode ?? "")}`);
}

async function RequestPage() {
  const user = await getCurrentUser();
  if (user?.role === RoleName.ADMIN) redirect("/dashboardcm");
  if (user?.plant?.code) {
    permanentRedirect(`/p/${encodeURIComponent(user.plant.code.toLowerCase())}/request`);
  }
  permanentRedirect("/p/rtb/request");
}

export default RequestPage;

export async function RequestPageContent({ error, plantCode }: { error?: string | null; plantCode?: string | null }) {
  const user = await getCurrentUser();
  if (user?.role === RoleName.ADMIN) redirect("/dashboardcm");
  if (user?.plant?.code && user.plant.code.toLowerCase() !== plantCode?.toLowerCase()) {
    redirect(`/p/${encodeURIComponent(user.plant.code.toLowerCase())}/request`);
  }
  const plantScope = await readRequestPlantScope(plantCode);
  const [categories, zones, assets] = await Promise.all([
    db.category.findMany({
      where: { active: true, OR: [{ plantId: plantScope.id }, { plantId: null, organizationId: plantScope.organizationId }] },
      orderBy: { name: "asc" }, select: { id: true, name: true },
    }),
    db.zone.findMany({
      where: { active: true, OR: [{ plantId: plantScope.id }, { plantId: null }] },
      orderBy: { name: "asc" }, select: { id: true, name: true },
    }),
    db.asset.findMany({ where: { plantId: plantScope.id, registrationStatus: "ACTIVE", operatingStatus: { not: "RETIRED" } }, select: { id: true, code: true, nameTh: true, nameEn: true, zoneId: true }, orderBy: { code: "asc" } }),
  ]);
  const submissionKey = randomUUID();

  return (
    <RequestShell signedIn={Boolean(user)}>
      <form action={submitRepairRequest} className="mx-auto grid max-w-3xl gap-4 px-8 pb-10 pt-0 sm:pt-5">
        <input name="plantCode" type="hidden" value={plantScope.code} />
        <input name="submissionKey" type="hidden" value={submissionKey} />
        {error === "site-limit" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Site นี้มีจำนวนใบแจ้งซ่อมถึง limit แล้ว กรุณาติดต่อผู้ดูแลระบบ
          </p>
        ) : null}
        <h1 className="flex flex-wrap items-baseline gap-2 text-3xl font-bold">
          <span>แจ้งซ่อม</span>
          <span className="text-xl font-black uppercase tracking-wide text-[var(--primary)]">
            {plantScope.code}
          </span>
        </h1>
        <input name="requesterName" required placeholder="ชื่อผู้แจ้ง" className="rounded-2xl border p-3 text-black" />
        <input name="requesterDepartment" required placeholder="หน่วยงาน/แผนก" className="rounded-2xl border p-3 text-black" />
        <label className="grid gap-1 text-sm font-bold text-[var(--ink)]">Category
          <select name="categoryId" required className="min-h-12 cursor-pointer rounded-2xl border bg-white p-3 text-black disabled:cursor-not-allowed disabled:opacity-60" disabled={!categories.length}>
            <option value="">{categories.length?"เลือก Category":"ยังไม่มี Category สำหรับ Site นี้"}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <RequestAssetFields zones={zones} assets={assets}/>
        <input name="problemTitle" required placeholder="หัวข้อปัญหา" className="rounded-2xl border p-3 text-black" />
        <textarea name="problemDetail" required placeholder="รายละเอียดปัญหา" className="min-h-32 rounded-2xl border p-3 text-black" />
        <select name="urgency" required className="rounded-2xl border p-3 text-black">
          <option value="NORMAL">ปกติ</option>
          <option value="URGENT">เร่งด่วน</option>
          <option value="CRITICAL">วิกฤต</option>
        </select>
        <RequestSubmitButton />
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
