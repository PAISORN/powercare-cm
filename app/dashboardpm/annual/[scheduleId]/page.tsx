import Link from "next/link";
import { CalendarDays, CheckCircle2, Factory, Printer } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { PmRouteShell } from "../../../../components/pm/pm-route-shell";
import { UserAvatar } from "../../../../components/user-avatar";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canManagePmGroups, canViewPm } from "../../../../modules/auth/permission";
import { resolvePmPageScope } from "../../../../modules/pm/pm-page-scope";
import { pmTargetColor, pmTargetGlowColor } from "../../../../modules/pm/pm-target-color";

type Query = { organizationId?: string; plantId?: string };

function mainAssetProgress(statuses: string[], primaryStatus?: string) {
  if (primaryStatus === "COMPLETED" || (!primaryStatus && statuses.length > 0 && statuses.every((status) => status === "COMPLETED"))) {
    return {
      label: "ดำเนินการเสร็จสิ้น",
      className: "border-emerald-300 bg-emerald-600 text-white",
      completed: true,
    };
  }

  if (statuses.some((status) => status === "IN_PROGRESS" || status === "COMPLETED")) {
    return {
      label: "กำลังดำเนินการ",
      className: "border-amber-300 bg-amber-100 text-amber-800",
      completed: false,
    };
  }

  return {
    label: "ยังไม่ได้ดำเนินการ",
    className: "border-slate-300 bg-slate-100 text-slate-700",
    completed: false,
  };
}

export default async function AnnualPmAssetsPage({ params, searchParams }: {
  params: Promise<{ scheduleId: string }>;
  searchParams: Promise<Query>;
}) {
  const user = await requireUser();
  if (!canViewPm(user)) redirect("/dashboardcm");
  const [route, query] = await Promise.all([params, searchParams]);
  const scope = await resolvePmPageScope(user, query);
  const serviceScope = { organizationId: scope.organization.id, plantId: scope.plant.id };
  const schedule = await db.pmAnnualSchedule.findFirst({
    where: { id: route.scheduleId, plantId: scope.plant.id, plan: serviceScope, status: "RELEASED" },
    select: {
      id: true, scheduleDateKey: true, assetSystemId: true, zoneId: true,
      assetSystem: { select: { nameTh: true } }, zone: { select: { name: true } },
      releaseSchedules: { select: { batch: { select: { pmPlan: { select: { number: true } } } } } },
    },
  });
  if (!schedule) notFound();

  const [assets, works, targetMainAssets] = await Promise.all([
    db.asset.findMany({
      where: { plantId: scope.plant.id },
      select: { id: true, parentId: true, assetLevel: true, code: true, nameTh: true, registrationStatus: true },
      orderBy: [{ code: "asc" }, { nameTh: "asc" }],
    }),
    db.pmWork.findMany({
      where: { plantId: scope.plant.id, pmPlan: serviceScope, annualSources: { some: { scheduleId: schedule.id } } },
      select: {
        id: true,
        assetId: true,
        number: true,
        status: true,
        assetCodeSnapshot: true,
        assetNameSnapshot: true,
        assignees: {
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePhoto: { select: { updatedAt: true } },
              },
            },
          },
          orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
        },
      },
      orderBy: { number: "asc" },
    }),
    db.asset.findMany({
      where: { plantId: scope.plant.id, assetLevel: "MAIN_ASSET", ...(schedule.assetSystemId ? { systemId: schedule.assetSystemId } : { zoneId: schedule.zoneId! }) },
      select: { id: true, code: true, nameTh: true, registrationStatus: true, imageStoragePath: true },
      orderBy: [{ code: "asc" }, { nameTh: "asc" }],
    }),
  ]);
  const assetById = new Map(assets.map(asset => [asset.id, asset]));
  // The target membership is read from Asset to avoid deriving System or Zone from its parent.
  const rootId = (assetId: string) => {
    let current = assetById.get(assetId);
    const seen = new Set<string>();
    while (current && current.assetLevel !== "MAIN_ASSET" && current.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      current = assetById.get(current.parentId);
    }
    return current?.assetLevel === "MAIN_ASSET" ? current.id : null;
  };
  const workByMain = new Map<string, typeof works>();
  for (const work of works) {
    const mainId = rootId(work.assetId);
    if (mainId) workByMain.set(mainId, [...(workByMain.get(mainId) ?? []), work]);
  }
  const listedMainIds = new Set(targetMainAssets.map(asset => asset.id));
  const otherWorks = works.filter(work => { const mainId = rootId(work.assetId); return !mainId || !listedMainIds.has(mainId); });
  const scopeQuery = new URLSearchParams(serviceScope).toString();
  const targetName = schedule.assetSystem?.nameTh ?? schedule.zone?.name ?? "System / Zone";
  const targetId = schedule.assetSystemId ?? schedule.zoneId ?? schedule.id;
  const targetColor = pmTargetColor(targetId);
  const targetGlow = pmTargetGlowColor(targetId);
  const softenedTargetColor = {
    ...targetColor,
    backgroundColor: `color-mix(in srgb, ${targetColor.backgroundColor} 62%, white)`,
    borderColor: `color-mix(in srgb, ${targetColor.borderColor} 58%, white)`,
  };
  return <><PmRouteShell title="PM Main Assets" description={`${targetName} · ${schedule.scheduleDateKey}`} scope={scope} currentPage="calendar" canManageGroups={canManagePmGroups(user)} scopeAction="/dashboardpm/calendar" />
    <main className="mx-auto mt-5 grid w-full max-w-[1680px] gap-5" aria-label="รายการ Main Assets สำหรับ PM">
      <style>{`
        [data-pm-main-asset-card] {
          box-shadow: none !important;
        }
        [data-pm-main-asset-card]:hover {
          box-shadow: 0 18px 48px var(--pm-target-glow), 0 0 32px var(--pm-target-glow) !important;
        }
      `}</style>
      <Link className="w-fit text-sm font-bold text-[var(--primary)]" href={`/dashboardpm/calendar?${scopeQuery}&view=month&month=${schedule.scheduleDateKey.slice(0, 7)}&date=${schedule.scheduleDateKey}`}>← PM Calendar</Link>
      <section className="activity-board-card activity-tone-blue relative overflow-hidden rounded-3xl border p-5">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="activity-board-icon flex size-12 shrink-0 items-center justify-center rounded-2xl border" aria-hidden="true">
              <CalendarDays size={26} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">Annual PM</p>
              <h2 className="mt-1 truncate text-2xl font-extrabold">{targetName}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">วันที่ {schedule.scheduleDateKey} · {schedule.releaseSchedules[0]?.batch.pmPlan.number ?? "PM Plan"}</p>
            </div>
          </div>
          <div className="activity-board-status flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-extrabold">
            <Factory size={18} aria-hidden="true" />
            Main Assets {targetMainAssets.length} รายการ
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 items-start justify-items-start gap-4 md:grid-cols-2 xl:grid-cols-4">{targetMainAssets.map(asset => {
        const assetWorks = workByMain.get(asset.id) ?? [];
        const primaryWork = assetWorks.find((work) => work.assetId === asset.id) ?? assetWorks[0];
        const progress = mainAssetProgress(assetWorks.map((work) => work.status), primaryWork?.status);
        const assignees = Array.from(new Map(
          assetWorks.flatMap((work) => work.assignees).map(({ user: assignee }) => [assignee.id, assignee]),
        ).values());
        const leadAssignee = assignees[0];
        const worksheetHref = `/dashboardpm/annual/${schedule.id}/assets/${asset.id}?${scopeQuery}`;
        return <article className="activity-board-card pm-main-asset-card group relative block w-full max-w-[360px] overflow-hidden rounded-[1.6rem] border p-2.5 transition duration-500 ease-out after:pointer-events-none after:absolute after:inset-0 after:z-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_22%_16%,rgba(255,255,255,0.88),transparent_48%)] after:opacity-35 after:transition-opacity after:duration-500 hover:-translate-y-1 hover:brightness-[1.025] hover:after:opacity-75 motion-reduce:transform-none motion-reduce:transition-none lg:h-[156px]" data-pm-main-asset-card key={asset.id} style={{ ...softenedTargetColor, "--activity-color": targetColor.borderColor, "--pm-card-text": targetColor.color, "--pm-target-glow": targetGlow } as CSSProperties}>
          <Link aria-label={`เปิดใบงาน PM ของ ${asset.nameTh}`} className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--activity-color)] focus-visible:ring-offset-2" href={worksheetHref} />
          <div className="pointer-events-none relative z-20 grid h-full min-h-[136px] grid-cols-[minmax(8.5rem,46%)_minmax(0,1fr)] items-center gap-2.5 lg:min-h-0">
            <div className="activity-board-icon flex aspect-[4/3] max-h-full w-full items-center justify-center overflow-hidden rounded-[1.25rem] border bg-white/45 p-1.5 shadow-sm">
              {asset.imageStoragePath
                ? <img alt={`รูป ${asset.nameTh}`} className="h-full w-full object-cover" src={`/asset-images/${asset.id}`} />
                : <Factory aria-hidden="true" className="h-12 w-12 transition duration-300 group-hover:scale-105" strokeWidth={1.55} />}
            </div>
            <div className="flex min-w-0 self-stretch flex-col pr-0.5">
              <div className="min-w-0 pt-1">
                <p className="truncate font-mono text-[11px] font-extrabold" title={asset.code ?? undefined}>{asset.code ?? "—"}</p>
              </div>
              <div className="mt-1 min-w-0">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)]">Main Asset</p>
                <h3 className="line-clamp-2 text-sm font-extrabold leading-[1.2]" title={asset.nameTh}>{asset.nameTh}</h3>
              </div>
              {asset.registrationStatus !== "ACTIVE" ? <span className="mt-1 self-start rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-700">Inactive</span> : null}
              <div className="mt-1 min-w-0" aria-label={leadAssignee ? `ผู้รับผิดชอบ ${assignees.map((assignee) => assignee.fullName).join(", ")}` : "ยังไม่ระบุผู้รับผิดชอบ"}>
                <div className="flex items-center">
                  {assignees.slice(0, 2).map((assignee, index) => <span className={`${index ? "-ml-2" : ""} [&>span]:!size-7`} key={assignee.id} title={assignee.fullName}>
                    <UserAvatar fullName={assignee.fullName} hasPhoto={Boolean(assignee.profilePhoto)} size="sm" userId={assignee.id} version={assignee.profilePhoto?.updatedAt.getTime()} />
                  </span>)}
                  {assignees.length > 2 ? <span className="-ml-2 grid size-7 place-items-center rounded-full border-2 border-white bg-slate-700 text-[9px] font-extrabold text-white shadow-md">+{assignees.length - 2}</span> : null}
                  {!leadAssignee ? <span className="[&>span]:!size-7"><UserAvatar fullName={null} size="sm" /></span> : null}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between gap-1 border-t border-white/50 pt-1">
                <span className={`inline-flex min-h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[9px] font-extrabold shadow-sm ${progress.className}`}>
                  {progress.completed ? <CheckCircle2 aria-hidden="true" size={13} strokeWidth={3} /> : null}
                  {progress.label}
                </span>
                {progress.completed ? <Link
                  aria-label={`พิมพ์ใบงาน PM ของ ${asset.nameTh}`}
                  className="pointer-events-auto relative z-30 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/80 text-[var(--pm-card-text)] shadow-sm transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--activity-color)]"
                  href={`${worksheetHref}&print=1`}
                  target="_blank"
                  title="พิมพ์ใบงาน PM"
                >
                  <Printer aria-hidden="true" size={13} strokeWidth={2.5} />
                </Link> : null}
              </div>
            </div>
          </div>
        </article>;
      })}</div>
      {otherWorks.length ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-extrabold">PM Work ที่ไม่อยู่ใต้ Main Asset ในรายการ</h3><ul className="mt-3 grid gap-2">{otherWorks.map(work => <li key={work.id}><Link className="block rounded-xl border border-amber-300 bg-white p-3 text-sm font-bold" href={`/dashboardpm/work/${work.id}?${scopeQuery}`}>{work.number} · {work.assetCodeSnapshot ?? "—"} · {work.assetNameSnapshot} →</Link></li>)}</ul></section> : null}
      {!targetMainAssets.length ? <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">ไม่พบ Main Assets ใน System/Zone นี้</p> : null}
    </main>
  </>;
}
