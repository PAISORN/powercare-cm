import { QrCode } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { QrCodeActions } from "../../../components/qr-code-actions";
import { requireUser } from "../../../lib/session";
import { getGeneralRequestUrl } from "../../../lib/public-url";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

export default async function AdminQrCodePage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const headerStore = await headers();
  const requestUrl = getGeneralRequestUrl({
    forwardedHost: headerStore.get("x-forwarded-host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    host: headerStore.get("host"),
    vercelUrl: process.env.VERCEL_URL,
  });
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
            <h1 className="mt-4 text-3xl font-extrabold">QR Code แจ้งซ่อมทั่วไป</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              QR กลางสำหรับติดหน้างานหรือจุดประชาสัมพันธ์ ผู้แจ้งซ่อมสแกนแล้วเข้าหน้าแจ้งซ่อมได้ทันทีโดยไม่ต้อง login
            </p>

            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
              <p className="text-sm font-semibold text-[var(--muted)]">Request URL</p>
              <code className="mt-2 block break-all rounded-xl bg-[var(--surface)] px-4 py-3 text-sm">{requestUrl}</code>
            </div>

            <div className="mt-5">
              <QrCodeActions qrImageUrl={qrImageUrl} requestUrl={requestUrl} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--line)] bg-white p-5 text-center text-slate-900 shadow-sm print:border-0 print:shadow-none">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">PowerCare.CM</p>
            <h2 className="mt-2 text-2xl font-extrabold">แจ้งซ่อมออนไลน์</h2>
            <p className="mt-1 text-sm text-slate-600">สแกน QR Code เพื่อแจ้งซ่อมทั่วไป</p>
            <img
              alt="QR Code สำหรับแจ้งซ่อมทั่วไป"
              className="mx-auto mt-5 aspect-square w-full max-w-[290px] rounded-2xl border border-emerald-100 bg-white p-3"
              src={qrImageUrl}
            />
            <p className="mt-4 break-all rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
              {requestUrl}
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
