import { randomUUID } from "node:crypto";
import { Wrench } from "lucide-react";
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
import { readPlantProfile } from "../../modules/organization/plant-profile-service";
import { readRequestPlantScope } from "../../modules/organization/plant-request-scope";

async function submitRepairRequest(formData: FormData) {
  "use server";
  const currentUser = await getCurrentUser();
  if (currentUser?.role === RoleName.ADMIN) redirect("/dashboard");
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
  if (user?.role === RoleName.ADMIN) redirect("/dashboard");
  if (user?.plant?.code) {
    permanentRedirect(`/p/${encodeURIComponent(user.plant.code.toLowerCase())}/request`);
  }
  permanentRedirect("/p/rtb/request");
}

export default RequestPage;

export async function RequestPageContent({ error, plantCode }: { error?: string | null; plantCode?: string | null }) {
  const user = await getCurrentUser();
  if (user?.role === RoleName.ADMIN) redirect("/dashboard");
  if (user?.plant?.code && user.plant.code.toLowerCase() !== plantCode?.toLowerCase()) {
    redirect(`/p/${encodeURIComponent(user.plant.code.toLowerCase())}/request`);
  }
  const plantScope = await readRequestPlantScope(plantCode);
  const [categories, zones, plantProfile, assets] = await Promise.all([
    db.category.findMany({
      where: { active: true, OR: [{ plantId: plantScope.id }, { plantId: null, organizationId: plantScope.organizationId }] },
      orderBy: { name: "asc" }, select: { id: true, name: true },
    }),
    db.zone.findMany({
      where: { active: true, OR: [{ plantId: plantScope.id }, { plantId: null }] },
      orderBy: { name: "asc" }, select: { id: true, name: true },
    }),
    readPlantProfile(plantScope.id),
    db.asset.findMany({ where: { plantId: plantScope.id, registrationStatus: "ACTIVE", operatingStatus: { not: "RETIRED" } }, select: { id: true, code: true, nameTh: true, nameEn: true, zoneId: true }, orderBy: { code: "asc" } }),
  ]);
  const submissionKey = randomUUID();

  return (
    <RequestShell signedIn={Boolean(user)}>
      <form action={submitRepairRequest} className="mx-auto grid max-w-3xl gap-4 px-8 py-10">
        <input name="plantCode" type="hidden" value={plantScope.code} />
        <input name="submissionKey" type="hidden" value={submissionKey} />
        <SiteIdentityHeader
          label="แจ้งซ่อมสำหรับ"
          plantCode={plantScope.code}
          plantName={plantScope.name}
          title={plantProfile.displayName}
        />
        {error === "site-limit" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Site นี้มีจำนวนใบแจ้งซ่อมถึง limit แล้ว กรุณาติดต่อผู้ดูแลระบบ
          </p>
        ) : null}
        <h1 className="text-3xl font-bold">แจ้งซ่อม</h1>
        <input name="requesterName" required placeholder="ชื่อผู้แจ้ง" className="rounded-md border p-3 text-black" />
        <input name="requesterDepartment" required placeholder="หน่วยงาน/แผนก" className="rounded-md border p-3 text-black" />
        <label className="grid gap-1 text-sm font-bold text-[var(--ink)]">Category
          <select name="categoryId" required className="min-h-12 cursor-pointer rounded-md border bg-white p-3 text-black disabled:cursor-not-allowed disabled:opacity-60" disabled={!categories.length}>
            <option value="">{categories.length?"เลือก Category":"ยังไม่มี Category สำหรับ Site นี้"}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <RequestAssetFields zones={zones} assets={assets}/>
        <input name="problemTitle" required placeholder="หัวข้อปัญหา" className="rounded-md border p-3 text-black" />
        <textarea name="problemDetail" required placeholder="รายละเอียดปัญหา" className="min-h-32 rounded-md border p-3 text-black" />
        <select name="urgency" required className="rounded-md border p-3 text-black">
          <option value="NORMAL">ปกติ</option>
          <option value="URGENT">เร่งด่วน</option>
          <option value="CRITICAL">วิกฤต</option>
        </select>
        <RequestSubmitButton />
      </form>
    </RequestShell>
  );
}

function SiteIdentityHeader({
  label,
  plantCode,
  plantName,
  title,
}: {
  label: string;
  plantCode: string;
  plantName: string;
  title: string;
}) {
  return (
    <section className="px-1 py-2 text-white" data-testid="repair-request-hero">
      <div className="flex items-start gap-4">
        <span className="mt-1 grid size-20 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/10 text-white">
          <Wrench aria-hidden="true" size={38} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm font-bold text-white/80">PowerCare CM · {label}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-white/90">{plantCode}</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-white/80">{plantName}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1.5 text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400" /> เปิดรับแจ้งซ่อม
            </span>
          </div>
        </div>
      </div>
    </section>
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
