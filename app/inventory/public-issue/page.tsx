import { ExternalLink, Link2, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { PublicIssueLinkActions } from "../../../components/store/public-issue-link-actions";
import { db } from "../../../lib/db";
import { getPlantStoreIssueUrl } from "../../../lib/public-url";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

type PageQuery = { organizationId?: string; plantId?: string };

export default async function PublicIssueManagementPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  const allowed = [
    PermissionKey.MANAGE_SPARE_PARTS,
    PermissionKey.VIEW_STORE_STOCK,
    PermissionKey.CREATE_STORE_ISSUE,
    PermissionKey.APPROVE_STORE_ISSUE,
    PermissionKey.ISSUE_STOCK,
    PermissionKey.ENABLE_PUBLIC_STORE_ISSUE,
  ].some((permission) => canUseUserPermission(user, permission));
  if (!allowed) redirect("/dashboard");

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const plant = await db.plant.findFirstOrThrow({
    where: { id: scope.plant.id, organizationId: scope.organization.id },
    select: {
      id: true,
      name: true,
      inventoryCode: true,
      publicStoreIssueEnabled: true,
      publicStoreIssueContactRequired: true,
    },
  });
  const requestHeaders = await headers();
  const requestUrl = getPlantStoreIssueUrl({
    forwardedHost: requestHeaders.get("x-forwarded-host"),
    forwardedProto: requestHeaders.get("x-forwarded-proto"),
    host: requestHeaders.get("host"),
    vercelUrl: process.env.VERCEL_URL,
  }, plant.inventoryCode ?? scope.plant.code);
  const qrDataUrl = await QRCode.toDataURL(requestUrl, {
    width: 720,
    margin: 2,
    color: { dark: "#0f766e", light: "#ffffff" },
  });
  const ready = Boolean(plant.inventoryCode && plant.publicStoreIssueEnabled);

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><QrCode aria-hidden="true" size={18} /> Inventory</p>
            <h1 className="mt-2 text-3xl font-extrabold">Issue Public</h1>
            <p className="mt-1 text-[var(--muted)]">ลิงก์และ QR Code สำหรับผู้เบิกอะไหล่ทั่วไปที่ไม่มี User ID</p>
          </div>
          <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--soft)]" href={requestUrl} target="_blank">
            <ExternalLink aria-hidden="true" size={17} /> ดูตัวอย่างหน้าเบิก
          </Link>
        </header>

        <AdminSiteScopeSelector
          action="/inventory/public-issue"
          description="QR และลิงก์ถูกล็อกตาม Site ข้อมูลอะไหล่และเลข CM จะไม่ข้าม Site"
          scope={scope}
          title="Issue Public site scope"
        />

        {!ready ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-extrabold">Issue Public ของ Site นี้ยังไม่พร้อมใช้งาน</p>
            <p className="mt-1">กำหนด Store Site Code และเปิด Public Store Issue ใน System Settings ก่อนแจก QR</p>
          </section>
        ) : null}

        <section className="grid gap-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${ready ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-500/10 text-[var(--muted)]"}`}>
              <ShieldCheck aria-hidden="true" size={15} /> {ready ? "เปิดใช้งาน" : "ยังไม่เปิดใช้งาน"}
            </span>
            <h2 className="mt-4 text-2xl font-extrabold">{plant.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Store Site Code: {plant.inventoryCode ?? "ยังไม่กำหนด"}</p>

            <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-4">
              <p className="flex items-center gap-2 text-sm font-bold"><Link2 aria-hidden="true" size={17} /> Public issue link</p>
              <code className="mt-2 block break-all rounded-xl bg-[var(--surface)] px-3 py-3 text-sm">{requestUrl}</code>
            </div>

            <div className="mt-5">
              <PublicIssueLinkActions enabled={ready} qrDataUrl={qrDataUrl} requestUrl={requestUrl} siteCode={plant.inventoryCode ?? scope.plant.code} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Feature icon={<Smartphone size={19} />} title="รองรับมือถือ" description="ฟอร์ม ปุ่ม และกล้องสแกนบาร์โค้ตออกแบบสำหรับหน้างาน" />
              <Feature icon={<ShieldCheck size={19} />} title="แยกข้อมูลตาม Site" description="เห็นเฉพาะ Stock, Zone และเลข CM ของ Site จากลิงก์นี้" />
            </div>
            <p className="mt-4 text-xs text-[var(--muted)]">ช่องทางติดต่อ: {plant.publicStoreIssueContactRequired ? "บังคับกรอก" : "ไม่บังคับกรอก"}</p>
          </div>

          <div className="rounded-3xl border border-cyan-100 bg-white p-5 text-center text-slate-900 print:border-0">
            <p className="text-sm font-extrabold uppercase text-teal-700">PowerCare.CM</p>
            <h3 className="mt-2 text-xl font-extrabold">Issue Public</h3>
            <p className="mt-1 text-sm text-slate-600">{plant.name}</p>
            <img alt={`QR Code เบิกอะไหล่สาธารณะ ${plant.name}`} className="mx-auto mt-4 aspect-square w-full max-w-[290px]" src={qrDataUrl} />
            <p className="mt-3 text-xs font-bold text-slate-500">สแกนเพื่อเปิดหน้าเบิกอะไหล่</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Feature({ description, icon, title }: { description: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] p-4">
      <p className="flex items-center gap-2 font-extrabold text-[var(--primary)]">{icon}{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}
