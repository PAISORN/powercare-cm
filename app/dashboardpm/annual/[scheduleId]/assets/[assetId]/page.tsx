import Link from "next/link";
import { CalendarDays, Check, ClipboardCheck, Factory, FileText, ImageIcon, Settings2, Wrench } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PmRouteShell } from "../../../../../../components/pm/pm-route-shell";
import { PmSubAssetDraftButton } from "../../../../../../components/pm/pm-sub-asset-draft-button";
import { PmWorksheetFooter } from "../../../../../../components/pm/pm-worksheet-footer";
import { PmWorksheetSummaryForm } from "../../../../../../components/pm/pm-worksheet-summary-form";
import { db } from "../../../../../../lib/db";
import { requireUser } from "../../../../../../lib/session";
import { canManagePmGroups, canViewPm } from "../../../../../../modules/auth/permission";
import { resolvePmPageScope } from "../../../../../../modules/pm/pm-page-scope";

type Query = { organizationId?: string; plantId?: string };

const statusLabels: Record<string, string> = {
  PLANNED: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELED: "ยกเลิก",
};

function displayValue(value: string | null | undefined, unit?: string | null) {
  if (!value) return "ยังไม่ได้ระบุ";
  return unit ? `${value} ${unit}` : value;
}

function parseTechnicalOptions(optionsJson: string | null, dataType: string) {
  if (dataType === "BOOLEAN" && !optionsJson) return ["ใช่", "ไม่ใช่"];
  try {
    const options = JSON.parse(optionsJson ?? "null");
    return Array.isArray(options) ? options.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  } catch {
    return [];
  }
}

function isNegativeResultOption(option: string) {
  const value = option.trim().toLowerCase();
  return value.includes("not") || value.includes("fail") || value === "ng" || value.includes("ผิด") || value.includes("ไม่");
}

export default async function AnnualPmAssetWorksheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheduleId: string; assetId: string }>;
  searchParams: Promise<Query>;
}) {
  const user = await requireUser();
  if (!canViewPm(user)) redirect("/dashboardcm");

  const [route, query] = await Promise.all([params, searchParams]);
  const scope = await resolvePmPageScope(user, query);
  const serviceScope = { organizationId: scope.organization.id, plantId: scope.plant.id };

  const schedule = await db.pmAnnualSchedule.findFirst({
    where: {
      id: route.scheduleId,
      plantId: scope.plant.id,
      plan: serviceScope,
      status: "RELEASED",
    },
    select: {
      id: true,
      scheduleDateKey: true,
      assetSystemId: true,
      zoneId: true,
      assetSystem: { select: { nameTh: true } },
      zone: { select: { name: true } },
      releaseSchedules: {
        select: { batch: { select: { pmPlan: { select: { number: true } } } } },
      },
    },
  });
  if (!schedule) notFound();

  const asset = await db.asset.findFirst({
    where: {
      id: route.assetId,
      plantId: scope.plant.id,
      assetLevel: "MAIN_ASSET",
      ...(schedule.assetSystemId
        ? { systemId: schedule.assetSystemId }
        : { zoneId: schedule.zoneId! }),
    },
    select: {
      id: true,
      code: true,
      nameTh: true,
      nameEn: true,
      imageStoragePath: true,
      installationLocation: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      keySpecification: true,
      criticality: true,
      operatingStatus: true,
      system: { select: { nameTh: true } },
      zone: { select: { name: true } },
      assetType: {
        select: {
          code: true,
          nameTh: true,
          fields: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { labelTh: "asc" }],
            select: {
              id: true,
              labelTh: true,
              labelEn: true,
              dataType: true,
              unit: true,
              helpText: true,
              optionsJson: true,
              required: true,
            },
          },
        },
      },
      technicalValues: {
        select: { fieldId: true, value: true, unit: true },
      },
      children: {
        where: { assetLevel: "SUB_ASSET", registrationStatus: "ACTIVE" },
        orderBy: [{ code: "asc" }, { nameTh: "asc" }],
        select: {
          id: true,
          code: true,
          nameTh: true,
          assetType: {
            select: {
              code: true,
              nameTh: true,
              fields: {
                where: { active: true },
                orderBy: [{ sortOrder: "asc" }, { labelTh: "asc" }],
                select: {
                  id: true,
                  labelTh: true,
                  labelEn: true,
                  dataType: true,
                  unit: true,
                  helpText: true,
                  optionsJson: true,
                  required: true,
                },
              },
            },
          },
          technicalValues: {
            select: { fieldId: true, value: true, unit: true },
          },
        },
      },
    },
  });
  if (!asset) notFound();

  const [allAssets, annualWorks] = await Promise.all([
    db.asset.findMany({
      where: { plantId: scope.plant.id },
      select: { id: true, parentId: true, assetLevel: true },
    }),
    db.pmWork.findMany({
      where: {
        plantId: scope.plant.id,
        pmPlan: serviceScope,
        annualSources: { some: { scheduleId: schedule.id } },
      },
      select: {
        id: true,
        assetId: true,
        number: true,
        status: true,
        assetCodeSnapshot: true,
        assetNameSnapshot: true,
        assignees: {
          orderBy: { assignedAt: "asc" },
          select: { id: true, role: true, user: { select: { fullName: true } } },
        },
      },
      orderBy: { number: "asc" },
    }),
  ]);

  const assetById = new Map(allAssets.map((item) => [item.id, item]));
  const rootId = (assetId: string) => {
    let current = assetById.get(assetId);
    const seen = new Set<string>();
    while (current && current.assetLevel !== "MAIN_ASSET" && current.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      current = assetById.get(current.parentId);
    }
    return current?.assetLevel === "MAIN_ASSET" ? current.id : null;
  };
  const works = annualWorks.filter((work) => rootId(work.assetId) === asset.id);
  const mainWork = works.find((work) => work.assetId === asset.id) ?? works[0];
  const checklistAssets = asset.children.length ? asset.children : [asset];
  const scopeQuery = new URLSearchParams(serviceScope).toString();
  const targetName = schedule.assetSystem?.nameTh ?? schedule.zone?.name ?? "System / Zone";
  const status = mainWork?.status ?? "PLANNED";

  return <>
    <PmRouteShell
      title="PM Worksheet"
      description={`${asset.code ?? "—"} · ${asset.nameTh}`}
      scope={scope}
      currentPage="calendar"
      canManageGroups={canManagePmGroups(user)}
      scopeAction="/dashboardpm/calendar"
    />
    <main className="mx-auto mt-5 grid w-full max-w-[1680px] gap-5" aria-label={`ใบงาน PM ${asset.nameTh}`}>
      <Link className="w-fit text-sm font-bold text-[var(--primary)]" href={`/dashboardpm/annual/${schedule.id}?${scopeQuery}`}>← Main Assets</Link>

      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-white"><ClipboardCheck size={30} /></span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black sm:text-3xl">ใบงาน PM (Preventive Maintenance)</h1>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Check Sheet · รายการตรวจจาก Technical Field Templates</p>
            </div>
          </div>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-extrabold text-amber-800">
            <CalendarDays size={18} />{statusLabels[status] ?? status}
          </span>
        </header>

        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <dl className="grid content-start gap-x-4 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
              <dt className="font-bold text-[var(--muted)]">รหัสเครื่องจักร</dt><dd className="font-extrabold">{asset.code ?? "—"}</dd>
              <dt className="font-bold text-[var(--muted)]">ชื่อเครื่องจักร</dt><dd className="font-extrabold">{asset.nameTh}</dd>
              <dt className="font-bold text-[var(--muted)]">ระบบ</dt><dd>{asset.system?.nameTh ?? targetName}</dd>
              <dt className="font-bold text-[var(--muted)]">พื้นที่ / โซน</dt><dd>{asset.zone?.name ?? "—"}{asset.installationLocation ? ` · ${asset.installationLocation}` : ""}</dd>
              <dt className="font-bold text-[var(--muted)]">ประเภท</dt><dd>{asset.assetType ? `${asset.assetType.code} · ${asset.assetType.nameTh}` : "—"}</dd>
              <dt className="font-bold text-[var(--muted)]">ผู้ผลิต / รุ่น</dt><dd>{[asset.manufacturer, asset.model].filter(Boolean).join(" · ") || "—"}</dd>
              <dt className="font-bold text-[var(--muted)]">หมายเลขเครื่อง</dt><dd>{asset.serialNumber ?? "—"}</dd>
              <dt className="font-bold text-[var(--muted)]">แผนการ PM</dt><dd>{schedule.releaseSchedules[0]?.batch.pmPlan.number ?? "PM Plan"}</dd>
              <dt className="font-bold text-[var(--muted)]">วันที่กำหนด</dt><dd>{schedule.scheduleDateKey}</dd>
            </dl>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--soft)]">
              {asset.imageStoragePath
                ? <img alt={`รูป ${asset.nameTh}`} className="aspect-[4/3] h-full w-full object-cover" src={`/asset-images/${asset.id}`} />
                : <div className="grid aspect-[4/3] place-items-center text-center text-[var(--muted)]"><div><ImageIcon className="mx-auto" size={44} /><p className="mt-2 text-sm font-bold">ยังไม่มีรูปประจำเครื่อง</p></div></div>}
            </div>
          </div>

          <aside className="grid content-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
            <h2 className="flex items-center gap-2 font-extrabold"><Wrench size={19} />ข้อมูลการดำเนินงาน</h2>
            <div className="rounded-xl bg-[var(--surface)] p-3 text-sm">
              <p className="font-bold text-[var(--muted)]">PM Work</p>
              <p className="mt-1 font-extrabold">{works.length} รายการ</p>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-3 text-sm">
              <p className="font-bold text-[var(--muted)]">ผู้ปฏิบัติงาน</p>
              <p className="mt-1 font-extrabold">{mainWork?.assignees.map((item) => item.user.fullName).join(", ") || "ยังไม่ได้มอบหมาย"}</p>
            </div>
            {mainWork ? <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white" href={`/dashboardpm/work/${mainWork.id}?${scopeQuery}`}>เปิด PM Work</Link> : null}
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold" href={`/assets/${asset.id}`}><Factory size={18} />ดูข้อมูลเครื่องจักร</Link>
          </aside>
        </div>
      </section>

      <div className="grid gap-5">{checklistAssets.map((checklistAsset) => {
        const fields = checklistAsset.assetType?.fields ?? [];
        const valueByField = new Map(checklistAsset.technicalValues.map((value) => [value.fieldId, value]));
        const isSubAsset = asset.children.length > 0;
        return <form className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-sm" key={checklistAsset.id}>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">{isSubAsset ? "Sub Asset" : "Main Asset"}</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black"><Settings2 className="shrink-0 text-[var(--primary)]" size={23} />{checklistAsset.code ?? "—"} · {checklistAsset.nameTh}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{checklistAsset.assetType ? `${checklistAsset.assetType.code} · ${checklistAsset.assetType.nameTh}` : "ยังไม่ได้ระบุ Asset Type"} · Technical Field Templates</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-2 rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-extrabold">{fields.length} รายการ</span>
              <PmSubAssetDraftButton draftKey={`pm-worksheet:${schedule.id}:${checklistAsset.id}`} />
            </div>
          </header>
          {fields.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="bg-[var(--soft)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="w-16 px-4 py-3 text-center">ลำดับ</th>
                  <th className="px-4 py-3">รายการตรวจเช็ก</th>
                  <th className="w-80 px-4 py-3 text-center">ผลตรวจสอบ</th>
                  <th className="w-56 px-4 py-3">ค่าที่ตั้งไว้</th>
                </tr>
              </thead>
              <tbody>{fields.map((field, index) => {
                const currentValue = valueByField.get(field.id);
                const resultOptions = parseTechnicalOptions(field.optionsJson, field.dataType);
                const resultName = `result_${checklistAsset.id}_${field.id}`;
                return <tr className="border-t border-[var(--line)]" key={field.id}>
                  <td className="px-4 py-3 text-center font-mono text-[var(--muted)]">{index + 1}</td>
                  <td className="px-4 py-3"><p className="font-extrabold">{field.labelTh}{field.required ? <span className="ml-1 text-red-600">*</span> : null}</p>{field.labelEn ? <p className="mt-0.5 text-xs text-[var(--muted)]">{field.labelEn}</p> : null}</td>
                  <td className="w-80 px-4 py-3">{resultOptions.length ? <fieldset aria-label={`ผลตรวจสอบ ${checklistAsset.nameTh} ${field.labelTh}`} className="grid min-h-11 w-full grid-flow-col auto-cols-fr items-center gap-2 whitespace-nowrap">
                    {resultOptions.map((option) => {
                      const negative = isNegativeResultOption(option);
                      return <label className="inline-flex min-w-0 cursor-pointer items-center justify-start gap-2 rounded-xl px-2 py-1.5 font-bold hover:bg-[var(--soft)]" key={option}>
                        <input className="peer sr-only" name={resultName} type="radio" value={option} />
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 bg-[var(--surface)] transition peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 ${negative ? "border-red-400 text-white peer-checked:bg-red-500 peer-focus-visible:ring-red-400" : "border-emerald-500 text-white peer-checked:bg-emerald-600 peer-focus-visible:ring-emerald-500"} peer-checked:[&>svg]:opacity-100`}>
                          <Check aria-hidden="true" className="opacity-0 transition" size={15} strokeWidth={3} />
                        </span>
                        <span>{option}</span>
                      </label>;
                    })}
                  </fieldset> : <label className="flex min-h-11 w-full items-stretch overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] focus-within:ring-2 focus-within:ring-[var(--primary)]">
                    <input
                      aria-label={`กรอกผลตรวจสอบ ${checklistAsset.nameTh} ${field.labelTh}`}
                      className="min-w-0 flex-1 bg-transparent px-3 outline-none"
                      name={resultName}
                      placeholder={field.helpText ?? "กรอกผลตรวจสอบ"}
                      required={field.required}
                      type={field.dataType === "NUMBER" ? "number" : field.dataType === "DATE" ? "date" : "text"}
                    />
                    {field.unit ? <span className="flex shrink-0 items-center border-l border-[var(--line)] bg-[var(--soft)] px-3 text-xs font-extrabold text-[var(--muted)]">{field.unit}</span> : null}
                  </label>}</td>
                  <td className="px-4 py-3 font-bold">{displayValue(currentValue?.value, currentValue?.unit ?? field.unit)}</td>
                </tr>;
              })}</tbody>
            </table>
          </div> : <div className="grid place-items-center p-10 text-center text-[var(--muted)]"><FileText size={38} /><p className="mt-3 font-bold">Sub Asset นี้ยังไม่มี Technical Field Templates</p></div>}
        </form>;
      })}</div>

      <PmWorksheetSummaryForm />

      <PmWorksheetFooter
        backHref={`/dashboardpm/annual/${schedule.id}?${scopeQuery}`}
        completeHref={mainWork ? `/dashboardpm/work/${mainWork.id}?${scopeQuery}` : undefined}
      />
    </main>
  </>;
}
