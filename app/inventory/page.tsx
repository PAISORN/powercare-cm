import { Beaker, Boxes, ClipboardClock, Droplets, Package, PackagePlus, Store } from "lucide-react";
import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { requireUser } from "../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../modules/auth/site-admin-permissions";

const issueMenus = [
  {
    href: "/inventory/issue?itemKind=SPARE_PART",
    title: "เบิกอะไหล่",
    description: "ค้นหาอะไหล่จาก Stock และอ้างอิงงาน CM",
    Icon: Package,
    tone: "from-blue-600/18 to-cyan-400/12",
    iconTone: "bg-blue-600",
  },
  {
    href: "/inventory/issue?itemKind=CHEMICAL",
    title: "เบิกสารเคมี",
    description: "เลือกสารเคมี จำนวน และพื้นที่ใช้งาน",
    Icon: Beaker,
    tone: "from-cyan-500/18 to-teal-400/12",
    iconTone: "bg-cyan-600",
  },
  {
    href: "/inventory/issue?itemKind=OIL",
    title: "เบิกน้ำมัน",
    description: "บันทึกการใช้น้ำมันสำหรับรถหรือเครื่องจักร",
    Icon: Droplets,
    tone: "from-sky-500/18 to-blue-500/12",
    iconTone: "bg-sky-600",
  },
] as const;

export default async function InventoryPage() {
  const user = await requireUser();
  const canCreateIssue = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1B3D] via-blue-800 to-blue-500 p-6 text-white shadow-xl sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-bold">
            <Store size={17} /> PowerCare Store
          </p>
          <h1 className="mt-5 text-3xl font-black sm:text-4xl">งาน Store</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
            เบิกอะไหล่ สารเคมี และน้ำมัน พร้อมติดตาม Stock และสถานะคำขอในที่เดียว
          </p>
        </header>

        {canCreateIssue ? (
          <section aria-labelledby="store-issue-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">สร้างใบเบิก</p>
                <h2 className="text-2xl font-black" id="store-issue-title">วันนี้ต้องการเบิกอะไร?</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {issueMenus.map(({ href, title, description, Icon, tone, iconTone }) => (
                <Link
                  className={`group min-h-44 rounded-3xl border border-[var(--line)] bg-gradient-to-br ${tone} p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/35 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]`}
                  href={href}
                  key={href}
                >
                  <span className={`grid size-14 place-items-center rounded-2xl ${iconTone} text-white shadow-lg`}>
                    <Icon aria-hidden="true" size={28} />
                  </span>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3" aria-label="เมนู Store เพิ่มเติม">
          <QuickLink href="/inventory/stock" icon={<Boxes size={22} />} label="Stock คลังอะไหล่" />
          <QuickLink href="/inventory/receive" icon={<PackagePlus size={22} />} label="รับสินค้าเข้า" />
          <QuickLink href="/inventory/tracking" icon={<ClipboardClock size={22} />} label="ติดตามใบเบิก" />
        </section>
      </div>
    </AppShell>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 font-extrabold shadow-sm transition-colors hover:bg-[var(--soft)]" href={href}>
      <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">{icon}</span>
      {label}
    </Link>
  );
}
