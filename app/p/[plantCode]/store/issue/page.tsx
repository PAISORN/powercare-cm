import { Building2, PackageSearch } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IssueRequestForm } from "../../../../../components/store/issue-request-form";
import { db } from "../../../../../lib/db";
import { createPublicStoreIssue } from "../../../../../modules/store/store-issue-prisma";

type PageQuery = { created?: string; error?: string };

async function createPublicIssueAction(formData: FormData) {
  "use server";
  const inventoryCode = String(formData.get("inventoryCode") ?? "").trim().toUpperCase();
  const stockKeys = formData.getAll("stockKey").map(String);
  const zoneIds = formData.getAll("zoneId").map(String);
  const quantities = formData.getAll("requestedQty").map(Number);
  let created: string | null = null;
  let errorMessage: string | null = null;
  try {
    const result = await createPublicStoreIssue(inventoryCode, {
      issueType: String(formData.get("issueType") ?? ""),
      cmWorkNumber: optionalText(formData.get("cmWorkNumber")),
      requesterName: String(formData.get("requesterName") ?? ""),
      requesterDepartment: String(formData.get("requesterDepartment") ?? ""),
      requesterContact: optionalText(formData.get("requesterContact")),
      note: optionalText(formData.get("note")),
      requestedAt: new Date(),
      items: stockKeys.map((key, index) => {
        const [storeId, sparePartId] = key.split(":");
        return { storeId, sparePartId, zoneId: zoneIds[index], requestedQty: quantities[index] };
      }),
    });
    created = result.number;
  } catch (error) {
    errorMessage = publicIssueError(error);
  }
  const params = new URLSearchParams(created ? { created } : { error: errorMessage ?? "Unknown error" });
  redirect(`/p/${inventoryCode.toLowerCase()}/store/issue?${params}`);
}

export default async function PublicStoreIssuePage({
  params,
  searchParams,
}: {
  params: Promise<{ plantCode: string }>;
  searchParams: Promise<PageQuery>;
}) {
  const { plantCode } = await params;
  const query = await searchParams;
  const inventoryCode = plantCode.trim().toUpperCase();
  const plant = await db.plant.findFirst({
    where: { inventoryCode, active: true, publicStoreIssueEnabled: true },
    select: {
      id: true,
      name: true,
      organizationId: true,
      publicStoreIssueContactRequired: true,
      organization: { select: { name: true } },
    },
  });
  if (!plant) notFound();

  const [stocks, issueZones, cmWorks] = await Promise.all([
    db.storeStock.findMany({
      where: { plantId: plant.id, quantity: { gt: 0 }, store: { active: true }, sparePart: { active: true } },
      include: {
        store: { select: { id: true, code: true, name: true, category: { select: { name: true } } } },
        sparePart: {
          select: {
            id: true,
            code: true,
            itemCode: true,
            name: true,
            unit: true,
            minStock: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
    }),
    db.storeApplicableZone.findMany({
      where: { plantId: plant.id, active: true, zone: { active: true } },
      select: { code: true, zone: { select: { id: true, name: true } } },
      orderBy: { code: "asc" },
    }),
    db.cmWork.findMany({
      where: { plantId: plant.id, organizationId: plant.organizationId },
      select: { id: true, number: true, machineName: true, problemTitle: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <main className="min-h-screen bg-[var(--page)] px-4 py-6 text-[var(--ink)] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">
            <Building2 size={16} />
            {plant.organization.name}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{plant.name}</h1>
          <p className="mt-2 text-white/85">ใบขอเบิกอะไหล่สาธารณะ · Store Site Code {inventoryCode}</p>
        </header>

        {query.created ? (
          <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <PackageSearch className="mx-auto text-emerald-600" size={48} />
            <h2 className="mt-3 text-2xl font-extrabold text-emerald-700">ส่งคำขอเบิกสำเร็จ</h2>
            <p className="mt-2">เลขที่ใบเบิก</p>
            <p className="mt-1 font-mono text-xl font-extrabold">{query.created}</p>
            <Link className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-emerald-600 px-5 font-bold text-white" href={`/store/tracking?number=${encodeURIComponent(query.created)}`}>
              ติดตามสถานะ
            </Link>
          </section>
        ) : null}

        {query.error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-700" role="alert">
            ส่งคำขอไม่สำเร็จ: {query.error}
          </p>
        ) : null}

        {!query.created ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
            <h2 className="text-2xl font-extrabold">ขอเบิกอะไหล่</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Engineer จะตรวจสอบก่อนส่งต่อให้ Store Officer จ่ายของ</p>
            <div className="mt-5">
              <IssueRequestForm
                action={createPublicIssueAction}
                cmWorks={cmWorks.map((work) => ({
                  id: work.id,
                  number: work.number,
                  label: `${work.machineName} · ${work.problemTitle}`,
                }))}
                inventoryCode={inventoryCode}
                organizationId={plant.organizationId}
                plantId={plant.id}
                issueZones={issueZones.map((item) => ({ ...item.zone, code: item.code }))}
                publicRequester={{ contactRequired: plant.publicStoreIssueContactRequired }}
                stocks={stocks.map((stock) => ({
                  storeId: stock.storeId,
                  sparePartId: stock.sparePartId,
                  label: `${stock.store.code} · ${stock.sparePart.code} · ${stock.sparePart.name}`,
                  available: Number(stock.quantity),
                  unit: stock.sparePart.unit,
                  storeCode: stock.store.code,
                  storeName: stock.store.name,
                  storeCategoryName: stock.store.category?.name,
                  sparePartCode: stock.sparePart.code,
                  sparePartName: stock.sparePart.name,
                  sparePartCategoryName: stock.sparePart.category?.name,
                  itemCode: stock.sparePart.itemCode,
                  stockStatus: buildStoreStockStatus(Number(stock.quantity), Number(stock.sparePart.minStock)),
                }))}
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function buildStoreStockStatus(quantity: number, minStock: number) {
  if (quantity <= 0) return "OUT";
  if (quantity <= minStock) return "LOW";
  return "ENOUGH";
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function publicIssueError(error: unknown) {
  if (!(error instanceof Error)) return "โปรดลองใหม่อีกครั้ง";
  const expected = ["required", "not available", "not found", "exceeds", "greater than zero", "outside"];
  return expected.some((text) => error.message.includes(text))
    ? error.message
    : "ไม่สามารถส่งคำขอได้ โปรดตรวจสอบข้อมูล";
}
