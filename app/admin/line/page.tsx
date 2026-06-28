import { CalendarClock, MessageCircleMore, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { formatThaiDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { RoleName, type Actor } from "../../../modules/cm-work/cm-work-types";
import {
  getLineDailyReportSetting,
  lineDailyReportTemplateFields,
  normalizeLineDailyReportDateMode,
  normalizeLineDailyReportSendTime,
  saveLineDailyReportSetting,
  templateFromFormData,
  type LineDailyReportTemplate,
} from "../../../modules/line/line-daily-report-settings";
import { dispatchLineDailyReport, type LineDailyReportDispatchResult } from "../../../modules/line/line-daily-report-dispatcher";
import { maskLineTargetId, resolveLineDiscoveryPrefill } from "../../../modules/line/line-settings";
import { listLineGroupDiscoveries } from "../../../modules/line/line-group-discovery-service";
import {
  listLineDestinations,
  retryFailedLineDelivery,
  saveLineDestination,
  testLineDestination,
} from "../../../modules/line/line-settings-service";
import { isLineServerConfigured, listLineDeliveryHistory } from "../../../modules/line/line-service";
import { LINE_EVENT_TYPES, type LineEventType } from "../../../modules/line/line-types";

const eventLabels: Record<string, string> = {
  NEW_REQUEST: "แจ้งซ่อมใหม่",
  CLAIMED: "รับงาน",
  REASSIGNED: "มอบหมายงาน",
  STATUS_CHANGED: "เปลี่ยนสถานะงาน",
  RETURNED: "ส่งกลับให้แก้ไข",
  WAITING_CLOSE: "รอปิดงาน",
  CLOSED: "ปิดงานแล้ว",
  CANCELED: "ยกเลิกงาน",
  DAILY_REPORT: "รายงานสรุปประจำวัน",
};

function actorFrom(user: { id: string; role: string; categoryId: string | null }): Actor {
  return { id: user.id, role: user.role as Actor["role"], categoryId: user.categoryId };
}

async function saveAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  try {
    await saveLineDestination(actorFrom(user), {
      id: String(formData.get("id") ?? "") || null,
      discoveryId: String(formData.get("discoveryId") ?? "") || null,
      displayName: String(formData.get("displayName") ?? ""),
      targetId: String(formData.get("targetId") ?? ""),
      categoryId: String(formData.get("categoryId") ?? "") || null,
      active: formData.get("active") === "on",
      enabledEvents: formData.getAll("enabledEvents").map(String),
    });
  } catch {
    redirect("/admin/line?error=save");
  }
  redirect("/admin/line?saved=1");
}

async function testAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  try {
    await testLineDestination(actorFrom(user), String(formData.get("id") ?? ""));
  } catch {
    redirect("/admin/line?error=test");
  }
  redirect("/admin/line?tested=1");
}

async function retryAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  try {
    await retryFailedLineDelivery(actorFrom(user), String(formData.get("id") ?? ""));
  } catch {
    redirect("/admin/line?error=retry");
  }
  redirect("/admin/line?retried=1");
}

async function saveDailyReportAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  try {
    const setting = await saveLineDailyReportSetting({
      enabled: formData.get("dailyReportEnabled") === "on",
      destinationId: String(formData.get("dailyReportDestinationId") ?? "") || null,
      sendTime: normalizeLineDailyReportSendTime(formData.get("dailyReportSendTime")),
      dateMode: normalizeLineDailyReportDateMode(formData.get("dailyReportDateMode")),
      template: templateFromFormData(formData),
    });
    await db.auditEvent.create({
      data: {
        actorId: user.id,
        entityType: "LineDailyReportSetting",
        entityId: setting.id,
        action: "UPDATE_LINE_DAILY_REPORT_SETTING",
        afterJson: JSON.stringify({
          enabled: setting.enabled,
          destinationId: setting.destinationId,
          sendTime: setting.sendTime,
          dateMode: setting.dateMode,
        }),
      },
    });
  } catch {
    redirect("/admin/line?error=daily-report");
  }
  redirect("/admin/line?dailyReportSaved=1");
}

async function sendDailyReportNowAction() {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  let result: LineDailyReportDispatchResult;
  try {
    result = await dispatchLineDailyReport({
      force: true,
      eventIdSuffix: `manual-${Date.now()}`,
    });
    await db.auditEvent.create({
      data: {
        actorId: user.id,
        entityType: "LineDailyReportSetting",
        entityId: "default",
        action: "SEND_LINE_DAILY_REPORT_TEST",
        afterJson: JSON.stringify(result),
      },
    });
  } catch {
    redirect("/admin/line?error=daily-report-test");
  }
  if (result.status === "SENT") {
    redirect("/admin/line?dailyReportTested=1");
  }
  redirect(`/admin/line?dailyReportSkipped=${encodeURIComponent(result.reason)}`);
}

export default async function AdminLineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    tested?: string;
    retried?: string;
    dailyReportSaved?: string;
    dailyReportTested?: string;
    dailyReportSkipped?: string;
    error?: string;
    discovery?: string;
  }>;
}) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const [destinations, categories, deliveries, discoveries, dailyReportSetting, query] = await Promise.all([
    listLineDestinations(),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    listLineDeliveryHistory(),
    listLineGroupDiscoveries(),
    getLineDailyReportSetting(),
    searchParams,
  ]);
  const selectedDiscovery = discoveries.find((discovery) => discovery.id === query.discovery) ?? null;
  const discoveryPrefill = selectedDiscovery ? resolveLineDiscoveryPrefill(selectedDiscovery) : null;

  return (
    <AppShell>
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
          <MessageCircleMore aria-hidden="true" size={18} /> Admin Communication
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">LINE Settings</h1>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          กำหนดกลุ่มปลายทาง Category และเหตุการณ์ที่ต้องการแจ้งเตือนผ่าน LINE Messaging API
        </p>
      </header>

      <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 ${isLineServerConfigured() ? "border-green-500/35 bg-green-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
        <p className="text-sm font-semibold">
          {isLineServerConfigured()
            ? "LINE_CHANNEL_ACCESS_TOKEN พร้อมใช้งานใน Server Environment"
            : "ยังไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN ระบบจะบันทึกการตั้งค่าได้ แต่จะยังไม่ส่งข้อความ"}
        </p>
      </div>

      {query.saved ? <Notice>บันทึกการตั้งค่า LINE เรียบร้อยแล้ว</Notice> : null}
      {query.tested ? <Notice>ส่งข้อความทดสอบสำเร็จแล้ว</Notice> : null}
      {query.retried ? <Notice>ส่งรายการเดิมซ้ำเรียบร้อยแล้ว</Notice> : null}
      {query.dailyReportSaved ? <Notice>บันทึกการตั้งค่ารายงานสรุป LINE เรียบร้อยแล้ว</Notice> : null}
      {query.dailyReportTested ? <Notice>ส่งรายงาน LINE ทดสอบเรียบร้อยแล้ว</Notice> : null}
      {query.dailyReportSkipped ? <Notice error>{lineDailyReportSkippedMessage(query.dailyReportSkipped)}</Notice> : null}
      {query.error ? <Notice error>ดำเนินการไม่สำเร็จ กรุณาตรวจสอบ Target ID, Token และการเชื่อมต่อ LINE</Notice> : null}

      <DailyReportSettingsForm
        action={saveDailyReportAction}
        testAction={sendDailyReportNowAction}
        destinations={destinations.filter((destination) => destination.active)}
        setting={dailyReportSetting}
      />

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">กลุ่ม LINE ที่ตรวจพบ</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">กลุ่มจะยังไม่รับการแจ้งเตือนจนกว่า Admin จะเพิ่มและเปิดใช้งาน</p>
          </div>
          <span className="text-sm text-[var(--muted)]">{discoveries.length} กลุ่ม</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {discoveries.map((discovery) => (
            <article className="rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4" key={discovery.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">{discovery.displayName ?? "Discovered LINE group"}</h3>
                  <p className="mt-1 font-mono text-sm text-[var(--muted)]">{maskLineTargetId(discovery.groupId)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${discovery.addedDestinationId ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {discovery.addedDestinationId ? "เพิ่มแล้ว" : "รอยืนยัน"}
                </span>
              </div>
              <dl className="mt-3 grid gap-1 text-sm text-[var(--muted)]">
                <div className="flex justify-between gap-3"><dt>พบครั้งแรก</dt><dd>{formatThaiDateTime(discovery.firstSeenAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt>พบล่าสุด</dt><dd>{formatThaiDateTime(discovery.lastSeenAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Event ล่าสุด</dt><dd>{discovery.eventType ?? "-"}</dd></div>
              </dl>
              {discovery.addedDestinationId ? (
                <p className="mt-3 text-sm font-semibold text-green-700">{discovery.addedDestination?.displayName ?? "เชื่อมกับกลุ่มแจ้งเตือนแล้ว"}</p>
              ) : (
                <Link className="mt-3 inline-flex min-h-10 items-center rounded-md border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--surface)]" href={`/admin/line?discovery=${encodeURIComponent(discovery.id)}#add-line-group`}>
                  Add group
                </Link>
              )}
            </article>
          ))}
          {!discoveries.length ? <p className="rounded-lg border border-dashed border-[var(--line)] p-6 text-center text-[var(--muted)]">ยังไม่พบกลุ่มจาก LINE Webhook</p> : null}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]" id="add-line-group">
        <h2 className="text-xl font-bold">เพิ่มกลุ่ม LINE</h2>
        <DestinationForm action={saveAction} categories={categories} prefill={discoveryPrefill ?? undefined} submitLabel="เพิ่มกลุ่ม" />
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">กลุ่มและเหตุการณ์แจ้งเตือน</h2>
          <span className="text-sm text-[var(--muted)]">{destinations.length} กลุ่ม</span>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {destinations.map((destination) => (
            <article className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]" key={destination.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold">{destination.displayName}</h3>
                  <p className="mt-1 font-mono text-sm text-[var(--muted)]">{maskLineTargetId(destination.targetId)}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{destination.category?.name ?? "ทุก Category"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${destination.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                  {destination.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
              <DestinationForm
                action={saveAction}
                categories={categories}
                destination={destination}
                submitLabel="บันทึกการแก้ไข"
              />
              <form action={testAction} className="mt-3">
                <input name="id" type="hidden" value={destination.id} />
                <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--soft)]" type="submit">
                  <Send aria-hidden="true" size={16} /> ส่งข้อความทดสอบ
                </button>
              </form>
            </article>
          ))}
          {!destinations.length ? <p className="rounded-lg border border-dashed border-[var(--line)] p-6 text-center text-[var(--muted)]">ยังไม่มีกลุ่ม LINE</p> : null}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">ประวัติการส่งล่าสุด</h2>
          <span className="text-sm text-[var(--muted)]">{deliveries.length} รายการ</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[760px] table-auto text-left text-sm">
            <thead className="text-[var(--muted)]"><tr><th className="p-3">เวลา</th><th className="p-3">กลุ่ม</th><th className="p-3">เหตุการณ์</th><th className="p-3">สถานะ</th><th className="p-3">ครั้ง</th><th className="p-3">ดำเนินการ</th></tr></thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr className="border-t border-[var(--line)]" key={delivery.id}>
                  <td className="p-3">{formatThaiDateTime(delivery.createdAt)}</td>
                  <td className="p-3 font-semibold">{delivery.destination.displayName}</td>
                  <td className="p-3">{eventLabels[delivery.eventType as LineEventType] ?? delivery.eventType}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${delivery.status === "SENT" ? "bg-green-100 text-green-800" : delivery.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{delivery.status}</span></td>
                  <td className="p-3">{delivery.attempts}/3</td>
                  <td className="p-3">
                    {delivery.status === "FAILED" && delivery.attempts < 3 ? (
                      <form action={retryAction}>
                        <input name="id" type="hidden" value={delivery.id} />
                        <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--line)] px-3 font-bold" type="submit"><RefreshCw size={15} /> Retry</button>
                      </form>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deliveries.length ? <p className="p-6 text-center text-[var(--muted)]">ยังไม่มีประวัติการส่ง</p> : null}
        </div>
      </section>
    </AppShell>
  );
}

function DailyReportSettingsForm({
  action,
  testAction,
  destinations,
  setting,
}: {
  action: (formData: FormData) => void | Promise<void>;
  testAction: () => void | Promise<void>;
  destinations: Array<{ id: string; displayName: string; category?: { name: string } | null }>;
  setting: {
    enabled: boolean;
    destinationId: string;
    sendTime: string;
    dateMode: string;
    template: LineDailyReportTemplate;
  };
}) {
  return (
    <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
            <CalendarClock aria-hidden="true" size={18} /> Daily Report
          </p>
          <h2 className="mt-2 text-xl font-bold">ตั้งค่ารายงานสรุปประจำวันผ่าน LINE</h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
            เลือกกลุ่มปลายทาง เวลา และข้อมูลที่ต้องการให้แสดงในข้อความรายงาน เช่น จำนวนงาน รายการงาน Category Zone หรือผู้รับงาน
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${setting.enabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
          {setting.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </span>
      </div>

      <form action={action} className="mt-5 grid gap-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 text-sm font-semibold">
            <input defaultChecked={setting.enabled} name="dailyReportEnabled" type="checkbox" /> เปิดรายงานประจำวัน
          </label>
          <label className="grid gap-1 text-sm font-semibold lg:col-span-2">
            กลุ่ม LINE ที่ต้องการส่งรายงาน
            <select className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={setting.destinationId} name="dailyReportDestinationId">
              <option value="">ยังไม่เลือกกลุ่ม</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.displayName}{destination.category?.name ? ` (${destination.category.name})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            เวลาส่ง
            <input className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={setting.sendTime} name="dailyReportSendTime" type="time" />
          </label>
          <label className="grid gap-1 text-sm font-semibold lg:col-span-2">
            วันที่ใช้ทำรายงาน
            <select className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={setting.dateMode} name="dailyReportDateMode">
              <option value="YESTERDAY">เมื่อวาน</option>
              <option value="TODAY">วันนี้</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-bold">เลือกข้อมูลที่ต้องการแสดงในรายงาน</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lineDailyReportTemplateFields.map((field) => (
              <label className="flex min-h-16 items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 py-3" key={field.key}>
                <input className="mt-1" defaultChecked={setting.template[field.key]} name={field.key} type="checkbox" />
                <span>
                  <span className="block text-sm font-bold">{field.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">{field.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white hover:bg-[var(--primary-strong)]" type="submit">
          <Save aria-hidden="true" size={17} /> บันทึกการตั้งค่ารายงาน
        </button>
      </form>

      <form action={testAction} className="mt-3">
        <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-[var(--primary)] bg-[var(--surface)] px-5 font-bold text-[var(--primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--soft)]" type="submit">
          <Send aria-hidden="true" size={17} /> ส่งรายงาน LINE ทดสอบตอนนี้
        </button>
        <p className="mt-2 text-xs text-[var(--muted)]">
          ใช้สำหรับทดสอบกลุ่มและรูปแบบข้อความทันที โดยไม่ต้องรอเวลาส่งรายงานประจำวัน
        </p>
      </form>
    </section>
  );
}

function lineDailyReportSkippedMessage(reason: string) {
  const messages: Record<string, string> = {
    DISABLED: "ยังไม่ได้เปิดใช้งาน Daily Report กรุณาเปิดใช้งานและบันทึกก่อนส่งทดสอบ",
    NO_DESTINATION: "ยังไม่ได้เลือกกลุ่ม LINE สำหรับ Daily Report",
    DESTINATION_INACTIVE: "กลุ่ม LINE ที่เลือกถูกปิดใช้งาน กรุณาเปิดใช้งานกลุ่มก่อน",
    NOT_DUE: "ยังไม่ถึงเวลาส่งรายงานตามที่ตั้งไว้",
  };
  return messages[reason] ?? "ยังไม่สามารถส่งรายงาน LINE ทดสอบได้ กรุณาตรวจสอบการตั้งค่า";
}

function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <p className={`mt-5 rounded-lg px-4 py-3 font-semibold ${error ? "bg-red-500/10 text-red-700" : "bg-green-500/10 text-green-700"}`} role={error ? "alert" : "status"}>{children}</p>;
}

function DestinationForm({
  action,
  categories,
  destination,
  prefill,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  categories: Array<{ id: string; name: string }>;
  destination?: {
    id: string;
    displayName: string;
    categoryId: string | null;
    active: boolean;
    settings: Array<{ eventType: string; enabled: boolean }>;
  };
  prefill?: {
    discoveryId: string;
    displayName: string;
    targetId: string;
    active: boolean;
  };
  submitLabel: string;
}) {
  const enabled = new Set(
    destination
      ? destination.settings.filter((setting) => setting.enabled).map((setting) => setting.eventType)
      : prefill
        ? []
        : LINE_EVENT_TYPES,
  );
  return (
    <form action={action} className="mt-4 grid gap-4">
      {destination ? <input name="id" type="hidden" value={destination.id} /> : null}
      {prefill ? <input name="discoveryId" type="hidden" value={prefill.discoveryId} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">ชื่อกลุ่ม<input className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={destination?.displayName ?? prefill?.displayName} maxLength={100} name="displayName" required /></label>
        <label className="grid gap-1 text-sm font-semibold">{destination ? "Target ID ใหม่ (เว้นว่างเพื่อใช้ค่าเดิม)" : "LINE Target ID"}<input className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={prefill?.targetId} name="targetId" required={!destination} /></label>
        <label className="grid gap-1 text-sm font-semibold">Category<select className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={destination?.categoryId ?? ""} name="categoryId"><option value="">ทุก Category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="flex min-h-11 items-center gap-2 self-end rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 font-semibold"><input defaultChecked={destination?.active ?? prefill?.active ?? true} name="active" type="checkbox" /> เปิดใช้งานกลุ่มนี้</label>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">เหตุการณ์ที่ต้องการแจ้งเตือน</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LINE_EVENT_TYPES.map((eventType) => <label className="flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 text-sm font-semibold" key={eventType}><input defaultChecked={enabled.has(eventType)} name="enabledEvents" type="checkbox" value={eventType} /> {eventLabels[eventType]}</label>)}
        </div>
      </fieldset>
      <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white hover:bg-[var(--primary-strong)]" type="submit"><Save aria-hidden="true" size={17} /> {submitLabel}</button>
    </form>
  );
}
