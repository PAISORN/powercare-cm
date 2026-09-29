"use client";

import {
  ArrowRight,
  Beaker,
  ClipboardCheck,
  Droplets,
  Package,
  PackageSearch,
  ShoppingCart,
} from "lucide-react";
import {
  IssueLineItemsEditor,
  type IssueZoneOption,
} from "./issue-line-items-editor";
import { IssueReviewModal } from "./issue-review-modal";
import {
  type CmOption,
  IssueRequestContextSection,
} from "./issue-request-context-section";
import type { StockOption } from "./issue-stock-selector";
import { useIssueRequestLines } from "./use-issue-request-lines";
import { useIssueRequestWorkflow } from "./use-issue-request-workflow";

export function IssueRequestForm({
  action,
  organizationId,
  plantId,
  stocks,
  issueZones,
  cmWorks,
  publicRequester,
  inventoryCode,
  lockedCmWork,
  directOnly = false,
  singleCard = false,
  hideHeader = false,
  initialItemKind = "SPARE_PART",
  requesterSummary,
  siteSummary,
}: {
  action: (formData: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  stocks: StockOption[];
  issueZones: IssueZoneOption[];
  cmWorks: CmOption[];
  publicRequester?: { contactRequired?: boolean };
  inventoryCode?: string;
  lockedCmWork?: CmOption;
  directOnly?: boolean;
  singleCard?: boolean;
  hideHeader?: boolean;
  initialItemKind?: "SPARE_PART" | "CHEMICAL" | "OIL";
  requesterSummary?: { name: string; department?: string | null };
  siteSummary?: { organizationName: string; plantName: string; inventoryCode?: string };
}) {
  const {
    activeStoreNames,
    addLine,
    changeItemKind,
    filters,
    itemKind,
    kindNoun,
    kindStocks,
    lines,
    removeLine,
    requestedTotal,
    resetLines,
    selectedLineCount,
    selectScannedStock,
    setFilters,
    updateLine,
  } = useIssueRequestLines({ initialItemKind, stocks });
  const {
    closeReview,
    formError,
    formRef,
    handleSubmit,
    isSubmitting,
    issueType,
    openReview,
    resetFormView,
    reviewMode,
    setIssueType,
    submissionKey,
  } = useIssueRequestWorkflow({
    directOnly,
    lines,
    onResetLines: resetLines,
    stocks,
  });
  const KindIcon = itemKind === "CHEMICAL" ? Beaker : itemKind === "OIL" ? Droplets : Package;

  return (
    <form
      action={action}
      className={singleCard ? "space-y-6 md:-mx-5 md:-mb-5" : "space-y-6"}
      data-testid="issue-request-form"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />
      <input name="submissionKey" type="hidden" value={submissionKey} />
      <input name="itemKind" type="hidden" value={itemKind} />
      {inventoryCode ? <input name="inventoryCode" type="hidden" value={inventoryCode} /> : null}
      {!hideHeader ? <header className={`px-1 py-2 ${singleCard ? "text-white" : "text-[var(--ink)]"}`}>
        <div className="flex items-start gap-4">
          <span className={`mt-1 grid size-20 shrink-0 place-items-center rounded-2xl border ${singleCard ? "border-white/25 bg-white/10 text-white" : "border-[var(--line)] bg-[var(--soft)] text-[var(--primary)]"}`}>
            <KindIcon aria-hidden="true" size={38} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black leading-tight sm:text-3xl">สร้างใบเบิก</h2>
            <p className={`mt-1 text-sm font-bold ${singleCard ? "text-white/80" : "text-[var(--primary)]"}`}>PowerCare Store · {kindNoun}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1 text-[11px] font-bold sm:gap-2 sm:text-xs">
              {siteSummary ? (
                <span className={`whitespace-nowrap rounded-full px-2 py-1.5 sm:px-2.5 ${singleCard ? "bg-white/10 text-white/90" : "bg-[var(--soft)] text-[var(--ink)]"}`}>
                  {siteSummary.inventoryCode ?? siteSummary.plantName}
                </span>
              ) : null}
              <span className={`whitespace-nowrap rounded-full px-2 py-1.5 sm:px-2.5 ${singleCard ? "bg-white/10 text-white/80" : "bg-[var(--soft)] text-[var(--muted)]"}`}>
                {activeStoreNames[0] ?? `คลัง${kindNoun}`} · {kindStocks.length.toLocaleString("th-TH")} รายการ
              </span>
              <span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2 py-1.5 sm:gap-1.5 sm:px-2.5 ${singleCard ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"}`}>
                <span className="size-2 rounded-full bg-emerald-400" /> เปิดให้บริการ
              </span>
            </div>
          </div>
        </div>
      </header> : null}

      <IssueRequestContextSection
        cmWorks={cmWorks}
        directOnly={directOnly}
        issueType={issueType}
        itemKind={itemKind}
        lockedCmWork={lockedCmWork}
        onIssueTypeChange={setIssueType}
        publicRequester={publicRequester}
        requesterSummary={requesterSummary}
      />

      <IssueLineItemsEditor
        filters={filters}
        itemKind={itemKind}
        issueZones={issueZones}
        kindNoun={kindNoun}
        kindStocks={kindStocks}
        lines={lines}
        onAddLine={addLine}
        onFiltersChange={setFilters}
        onItemKindChange={changeItemKind}
        onLineChange={updateLine}
        onRemoveLine={removeLine}
        onScannedStock={selectScannedStock}
        publicRequester={Boolean(publicRequester)}
        stocks={stocks}
      />
      {formError ? (
        <p className={`${singleCard ? "mx-4 mt-4 sm:mx-5" : ""} rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600`} role="alert">
          {formError}
        </p>
      ) : null}

      {!stocks.length ? (
        <p className={`${singleCard ? "mx-4 mt-4 sm:mx-5" : ""} rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300`}>
          ยังไม่มี Stock ที่พร้อมให้เบิกใน Site นี้
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className={`${secondaryButtonClass} max-sm:hidden`} onClick={resetFormView} type="button">
          ยกเลิก
        </button>
        <div className="min-w-0 sm:mr-auto">
          <p className="text-sm font-extrabold">รวม {selectedLineCount} รายการ</p>
          <p className="text-xs text-[var(--muted)]">จำนวนรวม {requestedTotal.toLocaleString("th-TH")} หน่วย</p>
        </div>
        <button className={`${primaryButtonClass} min-h-14 justify-center max-sm:w-full sm:min-w-72`} disabled={!kindStocks.length} onClick={openReview} type="button">
          <ClipboardCheck size={19} /> ตรวจสอบและเสร็จสิ้น <ArrowRight size={18} />
        </button>
      </div>

      {reviewMode ? (
        <IssueReviewModal
          isSubmitting={isSubmitting}
          issueZones={issueZones}
          lines={lines}
          onBack={closeReview}
          stocks={stocks}
        />
      ) : null}
    </form>
  );
}

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45";
