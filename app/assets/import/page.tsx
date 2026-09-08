import { redirect } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import { AppShell } from "../../../components/app-shell";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AssetImportPreview } from "../../../components/asset-import-preview";
import { requireUser } from "../../../lib/session";

import { canManageAssets } from "../../../modules/auth/permission";
import { resolveAssetScope } from "../../../modules/assets/asset-scope";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { importRegisteredAssets } from "../../../modules/assets/asset-import";

async function previewAssets(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) return { error: "ไม่มีสิทธิ์นำเข้า Asset" };
  const scope = await resolveAssetScope(user, adminScopeSearchFromFormData(formData));
  try {
    const count = await importRegisteredAssets(scope.plant.id, JSON.parse(String(formData.get("rowsJson") || "[]")), true);
    return { count };
  } catch (e) { return { error: e instanceof Error ? e.message : "ตรวจสอบไม่สำเร็จ" }; }
}
async function importAssets(formData: FormData) {
  "use server";
  const user = await requireUser(); if (!canManageAssets(user)) redirect("/assets");
  const scope = await resolveAssetScope(user, adminScopeSearchFromFormData(formData));
  const query = `organizationId=${scope.organization.id}&plantId=${scope.plant.id}`;
  let created = 0;
  try { created = await importRegisteredAssets(scope.plant.id, JSON.parse(String(formData.get("rowsJson") || "[]"))); }
  catch (e) { redirect(`/assets/import?${query}&error=${encodeURIComponent(e instanceof Error ? e.message : "Import ไม่สำเร็จ")}`); }
  redirect(`/assets?${query}&imported=${created}`);
}
export default async function AssetImportPage({searchParams}:{searchParams:Promise<{organizationId?:string;plantId?:string;error?:string}>}){const user=await requireUser();if(!canManageAssets(user))redirect("/assets");const query=await searchParams;const scope=await resolveAssetScope(user,query);return <AppShell><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Asset import</p><h1 className="mt-2 text-3xl font-black">นำเข้า Assets จาก Excel</h1><p className="mt-2 text-sm text-[var(--muted)]">นำเข้า Main Asset, Sub-Asset และ Part พร้อมกันโดยอ้างอิง Parent Code</p></div><a href="/assets/import/template" className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--soft)]"><Download size={17}/>ดาวน์โหลด Template</a></header>{query.error?<p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">{query.error}</p>:null}<section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"><div className="mb-4 flex items-center gap-3"><FileSpreadsheet className="text-emerald-600"/><div><h2 className="font-black">Preview และตรวจสอบ</h2><p className="text-xs text-[var(--muted)]">ระบุ Asset Code และ Master Data ตามระบบใหม่ ตรวจสอบทุกแถวก่อนบันทึกพร้อมกัน</p></div></div><form action={importAssets}><AdminScopeHiddenFields scope={scope}/><AssetImportPreview previewAction={previewAssets}/></form></section></AppShell>}
