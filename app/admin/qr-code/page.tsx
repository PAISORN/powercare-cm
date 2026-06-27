import { QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

export default async function AdminQrCodePage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold text-[var(--primary)]">
          <QrCode size={18} />
          Admin Settings
        </p>
        <h1 className="mt-4 text-3xl font-extrabold">QR Code</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          เตรียมพื้นที่สำหรับสร้าง QR Code ให้ผู้แจ้งซ่อมทั่วไปสแกนเข้าไปที่หน้าแจ้งซ่อมได้ทันที
        </p>
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
          <p className="text-sm font-semibold text-[var(--muted)]">Request URL</p>
          <code className="mt-2 block break-all rounded-xl bg-[var(--surface)] px-4 py-3 text-sm">/request</code>
        </div>
      </section>
    </AppShell>
  );
}
