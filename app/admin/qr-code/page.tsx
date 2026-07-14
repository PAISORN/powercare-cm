import { QrCode } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { QrCodeActions } from "../../../components/qr-code-actions";
import { requireUser } from "../../../lib/session";
import { canManageQrCode } from "../../../modules/auth/permission";
import { getPlantRequestUrl } from "../../../lib/public-url";
import { getPlantStoreIssueUrl } from "../../../lib/public-url";
import { db } from "../../../lib/db";
import { resolveAdminSiteScope } from "../../../modules/admin/admin-site-scope";

export default async function AdminQrCodePage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; plantId?: string }>;
}) {
  const user = await requireUser();
  if (!canManageQrCode(user)) redirect("/dashboard");
  const headerStore = await headers();
  const query = await searchParams;
  const scope = await resolveAdminSiteScope(user, query);
  const organizationId = scope.organization.id;
  const qrPlants = scope.plants;
  const storeQrPlants = await db.plant.findMany({
    where: { id: { in: qrPlants.map((plant) => plant.id) } },
    select: { id: true, inventoryCode: true, publicStoreIssueEnabled: true },
  });
  const storeQrByPlantId = new Map(storeQrPlants.map((plant) => [plant.id, plant]));
  const fallbackPlant = scope.plant;
  const requestPlantCode = fallbackPlant.code;
  const publicUrlInput = {
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    host: headerStore.get("host"),
    vercelUrl: process.env.VERCEL_URL,
  };
  const requestUrl = getPlantRequestUrl(publicUrlInput, requestPlantCode);
  const qrImageUrl = "/admin/qr-code/request.svg";

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] print:border-0 print:shadow-none">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold text-[var(--primary)] print:hidden">
              <QrCode size={18} />
              Admin Settings
            </p>
            <h1 className="mt-4 text-3xl font-extrabold">QR Code แจ้งซ่อมราย Site</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              สร้าง QR Code แยกตาม Site เพื่อให้ผู้แจ้งซ่อมสแกนแล้วเข้าหน้าแจ้งซ่อมของ Site นั้นโดยตรง ข้อมูลจะไม่ปนกับ Site อื่น
            </p>

            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
              <p className="text-sm font-semibold text-[var(--muted)]">Default Request URL</p>
              <code className="mt-2 block break-all rounded-xl bg-[var(--surface)] px-4 py-3 text-sm">{requestUrl}</code>
            </div>

            <div className="mt-5">
              <AdminSiteScopeSelector
                action="/admin/qr-code"
                scope={scope}
                title="QR scope"
                description="เลือก Organization และ Site เพื่อดู QR Code แจ้งซ่อมของแต่ละ Site"
              />
            </div>

            <div className="mt-5">
              <QrCodeActions qrImageUrl={qrImageUrl} requestUrl={requestUrl} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--line)] bg-white p-5 text-center text-slate-900 shadow-sm print:border-0 print:shadow-none">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">PowerCare.CM</p>
            <h2 className="mt-2 text-2xl font-extrabold">Site QR Code</h2>
            <p className="mt-1 text-sm text-slate-600">ตัวอย่าง QR Code สำหรับ Site แรกในรายการ</p>
            <img
              alt="Site QR Code สำหรับแจ้งซ่อม"
              className="mx-auto mt-5 aspect-square w-full max-w-[290px] rounded-2xl border border-emerald-100 bg-white p-3"
              src={`${qrImageUrl}?organizationId=${encodeURIComponent(organizationId)}&plantId=${encodeURIComponent(fallbackPlant.id)}`}
            />
            <p className="mt-4 break-all rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
              {requestUrl}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5">
        {qrPlants.map((plant) => {
          const siteRequestUrl = getPlantRequestUrl(publicUrlInput, plant.code);
          const siteQrImageUrl = `/admin/qr-code/request.svg?organizationId=${encodeURIComponent(organizationId)}&plantId=${encodeURIComponent(plant.id)}`;
          const storeQr = storeQrByPlantId.get(plant.id);
          const storeIssueUrl = storeQr?.inventoryCode
            ? getPlantStoreIssueUrl(publicUrlInput, storeQr.inventoryCode)
            : null;
          const storeQrImageUrl = `${siteQrImageUrl}&type=store`;

          return (
            <article key={plant.id} className="grid gap-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:grid-cols-[220px_1fr]">
              <div className="rounded-3xl border border-[var(--line)] bg-white p-4 text-center text-slate-900">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">PowerCare.CM</p>
                <img
                  alt={`Site QR Code ${plant.name}`}
                  className="mx-auto mt-3 aspect-square w-full max-w-[180px] rounded-2xl border border-emerald-100 bg-white p-2"
                  src={siteQrImageUrl}
                />
              </div>
              <div>
                <p className="inline-flex rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">Site QR Code</p>
                <h2 className="mt-3 text-2xl font-extrabold">{plant.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Site code: {plant.code}</p>
                <code className="mt-4 block break-all rounded-2xl bg-[var(--soft)] px-4 py-3 text-sm">{siteRequestUrl}</code>
                <div className="mt-4">
                  <QrCodeActions qrImageUrl={siteQrImageUrl} requestUrl={siteRequestUrl} />
                </div>
                {storeIssueUrl && storeQr?.publicStoreIssueEnabled ? (
                  <div className="mt-5 border-t border-[var(--line)] pt-5">
                    <p className="inline-flex rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-700">Store Issue QR</p>
                    <code className="mt-3 block break-all rounded-2xl bg-[var(--soft)] px-4 py-3 text-sm">{storeIssueUrl}</code>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
                      <img alt={`Store Issue QR ${plant.name}`} className="aspect-square w-full rounded-2xl border border-cyan-100 bg-white p-2" src={storeQrImageUrl} />
                      <QrCodeActions qrImageUrl={storeQrImageUrl} requestUrl={storeIssueUrl} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-[var(--soft)] px-4 py-3 text-sm text-[var(--muted)]">
                    Store Issue QR ยังไม่เปิดใช้งานใน System Settings
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </AppShell>
  );
}
