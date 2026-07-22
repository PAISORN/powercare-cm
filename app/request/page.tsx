import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { PublicHeader } from "../../components/public-header";
import { RequestSubmitButton } from "../../components/request-submit-button";
import { getActiveCategoriesForPlantScope, getActiveZonesForScope } from "../../lib/query-cache";
import { getCurrentUser } from "../../lib/session";
import { repairRequestSchema } from "../../lib/validation";
import { createRepairRequest } from "../../modules/cm-work/cm-work-service";
import { readPlantProfile } from "../../modules/organization/plant-profile-service";
import { readRequestPlantScope } from "../../modules/organization/plant-request-scope";

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

  const plantCode = String(formData.get("plantCode") ?? "") || null;
  const submissionKey = String(formData.get("submissionKey") ?? "");
  let work;
  try {
    work = await createRepairRequest({ ...parsed, plantCode, submissionKey });
  } catch (error) {
    if (error instanceof Error && error.message === "SITE_REQUEST_LIMIT_REACHED") {
      redirect(`/request?plant=${encodeURIComponent(plantCode ?? "")}&error=site-limit`);
    }
    throw error;
  }
  redirect(`/request/success/${work.number}?plant=${encodeURIComponent(plantCode ?? "")}`);
}

export default async function RequestPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; plant?: string }>;
}) {
  const query = await searchParams;
  return <RequestPageContent error={query?.error ?? null} plantCode={query?.plant ?? null} />;
}

export async function RequestPageContent({ error, plantCode }: { error?: string | null; plantCode?: string | null }) {
  const user = await getCurrentUser();
  const plantScope = await readRequestPlantScope(plantCode);
  const [categories, zones, plantProfile] = await Promise.all([
    getActiveCategoriesForPlantScope(plantScope.id, plantScope.organizationId),
    getActiveZonesForScope(plantScope.id),
    readPlantProfile(plantScope.id),
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
    <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[var(--primary)]">{label}</p>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[var(--ink)] md:text-5xl">{title}</h1>
      <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
        Site: {plantName} · Code: {plantCode}
      </p>
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
