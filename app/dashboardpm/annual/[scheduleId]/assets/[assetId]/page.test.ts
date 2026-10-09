import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "app/dashboardpm/annual/[scheduleId]/assets/[assetId]/page.tsx",
  "utf8",
);
const listSource = readFileSync(
  "app/dashboardpm/annual/[scheduleId]/page.tsx",
  "utf8",
);
const summarySource = readFileSync(
  "components/pm/pm-worksheet-summary-form.tsx",
  "utf8",
);
const draftSource = readFileSync(
  "components/pm/pm-sub-asset-draft-button.tsx",
  "utf8",
);
const footerSource = readFileSync(
  "components/pm/pm-worksheet-footer.tsx",
  "utf8",
);
const printSource = readFileSync(
  "components/pm/pm-worksheet-print-button.tsx",
  "utf8",
);
const printDocumentSource = readFileSync(
  "components/pm/pm-worksheet-print-document.tsx",
  "utf8",
);

describe("Annual PM Main Asset worksheet", () => {
  it("opens a worksheet from every Main Asset card", () => {
    expect(listSource).toContain("/assets/${asset.id}?");
    expect(listSource).toContain("เปิดใบงาน PM ของ");
  });

  it("shows aggregate PM progress on every Main Asset card", () => {
    expect(listSource).toContain('primaryStatus === "COMPLETED"');
    expect(listSource).toContain(
      "assetWorks.find((work) => work.assetId === asset.id) ?? assetWorks[0]",
    );
    expect(listSource).toContain(
      'status === "IN_PROGRESS" || status === "COMPLETED"',
    );
    expect(listSource).toContain("ยังไม่ได้ดำเนินการ");
    expect(listSource).toContain("กำลังดำเนินการ");
    expect(listSource).toContain("ดำเนินการเสร็จสิ้น");
    expect(listSource).toContain("progress.completed ? <CheckCircle2");
  });

  it("renders wide Main Asset cards with target, image, assignees, and status", () => {
    expect(listSource).toContain("data-pm-main-asset-card");
    expect(listSource).toContain("md:grid-cols-2 xl:grid-cols-4");
    expect(listSource).toContain("lg:h-[156px]");
    expect(listSource).toContain(
      "grid-cols-[minmax(8.5rem,46%)_minmax(0,1fr)]",
    );
    expect(listSource).toContain("aspect-[4/3]");
    expect(listSource).toContain("imageStoragePath");
    expect(listSource).not.toContain("title={targetName}");
    expect(listSource).toContain("assignees:");
    expect(listSource).toContain("<UserAvatar");
    expect(listSource).toContain(
      "const targetId = schedule.assetSystemId ?? schedule.zoneId ?? schedule.id",
    );
    expect(listSource).toContain("pmTargetColor(targetId)");
    expect(listSource).toContain('"--pm-target-glow": targetGlow');
    expect(listSource).toContain("pmTargetGlowColor(targetId)");
    expect(listSource).toContain("color-mix(in srgb");
    expect(listSource).toContain(
      "box-shadow: 0 18px 48px var(--pm-target-glow), 0 0 32px var(--pm-target-glow) !important",
    );
    expect(listSource).toContain("box-shadow: none !important");
    expect(listSource).not.toContain("hover:shadow-[0_18px_48px");
    expect(listSource).toContain("hover:after:opacity-75");
    expect(listSource).not.toContain("pmTargetColor(asset.code ?? asset.id)");
    expect(listSource).toContain("line-clamp-2 text-sm");
    expect(listSource).toContain("assignees.slice(0, 2)");
    expect(listSource).toContain("assignees.length - 2");
    expect(listSource).toContain("w-full max-w-[360px]");
    expect(listSource).toContain("mt-auto flex items-center justify-between");
    expect(listSource).toContain("bg-slate-700");
    expect(listSource).toContain("text-white shadow-md");
    expect(listSource).toContain("พิมพ์ใบงาน PM ของ");
    expect(listSource).toContain("&print=1");
    expect(listSource).toContain("{progress.completed ? <Link");
    expect(listSource).toContain("<article");
    expect(listSource).not.toContain(">Asset code</p>");
    expect(listSource).not.toContain("PM Works</span>");
    expect(listSource).not.toContain(">ผู้รับผิดชอบ</p>");
  });

  it("prints the worksheet from the header and keeps the PM status beside it", () => {
    expect(source).toContain("<PmWorksheetPrintButton");
    expect(source).toContain('autoPrint={query.print === "1"}');
    expect(source).toContain("disabled={!completed}");
    expect(source).toContain("data-pm-worksheet-page");
    expect(printSource).toContain("window.print()");
    expect(printSource).toContain("pm-worksheet-printing");
    expect(printSource).toContain("พิมพ์ / บันทึก PDF");
    expect(footerSource).toContain("data-pm-no-print");
  });

  it("builds a dedicated A4 document from the completed PM worksheet", () => {
    expect(source).toContain("<PmWorksheetPrintDocument");
    expect(source).toContain("completed && mainWork");
    expect(source).toContain("startedAt: true");
    expect(source).toContain("completedAt: true");
    expect(source).toContain("completedBy: { select: { fullName: true } }");
    expect(source).toContain("const printChecklists = checklists.map");
    expect(source).toContain(
      "result: worksheetValues[pmCheckSheetResultName(checklist.assetId, field)]",
    );
    expect(source).toContain(
      "other: worksheetValues[pmCheckSheetOtherName(checklist.assetId, field)]",
    );
    expect(printDocumentSource).toContain("data-pm-print-document");
    expect(printDocumentSource).toContain("ใบงานบำรุงรักษาเชิงป้องกัน");
    expect(printDocumentSource).toContain("ดัชนีชี้วัด");
    expect(printDocumentSource).toContain("ผู้ตรวจสอบ");
    expect(printDocumentSource).toContain("ผู้อนุมัติ");
  });

  it("loads Asset identity, image, technical templates, and annual PM works", () => {
    expect(source).toContain('assetLevel: "MAIN_ASSET"');
    expect(source).toContain("imageStoragePath: true");
    expect(source).toContain("fields:");
    expect(source).toContain(
      "annualSources: { some: { scheduleId: schedule.id } }",
    );
  });

  it("renders the snapshotted Default and Custom items as the PM check sheet", () => {
    expect(source).toContain("checklists.map");
    expect(source).toContain("checklist.items");
    expect(source).toContain('field.source === "CUSTOM"');
  });

  it("groups check sheets by the Asset-level PM Work snapshots under the Main Asset", () => {
    expect(source).toContain("parsePmCheckSheetSnapshot(work.checkSheetSnapshotJson)");
    expect(source).toContain("legacySnapshots.get(work.assetId)");
    expect(source).toContain('{isSubAsset ? "Sub Asset" : "Main Asset"}');
    expect(source).toContain("pmCheckSheetResultName(checklist.assetId, field)");
  });

  it("centers the result heading and saves a recoverable local draft per Sub Asset", () => {
    expect(source).toContain('className="w-80 px-4 py-3 text-center"');
    expect(source).toContain("ผลตรวจสอบ");
    expect(source).toContain(
      "pm-worksheet:${schedule.id}:${checklist.assetId}",
    );
    expect(source).toContain("<PmSubAssetDraftButton");
    expect(draftSource).toContain("window.localStorage.setItem");
    expect(draftSource).toContain("window.localStorage.getItem");
    expect(draftSource).toContain("บันทึกร่าง");
  });

  it("renders bottom worksheet actions and saves every Sub Asset draft together", () => {
    expect(source).toContain("<PmWorksheetFooter");
    expect(source).toContain("completeAction={");
    expect(source).toContain(
      '["PLANNED", "IN_PROGRESS"].includes(mainWork.status)',
    );
    expect(source).toContain("await completePmWorksheet");
    expect(source).toContain("workIds: works.map((work) => work.id)");
    expect(source).toContain("requiredFieldNames");
    expect(source).toContain(
      'mainWork.status === "COMPLETED" ? "updated" : "completed"',
    );
    expect(source).toContain("reviseCompletedPmWorksheet");
    expect(source).toContain("worksheetDataJson");
    expect(draftSource).toContain("data-pm-draft-save");
    expect(footerSource).toContain("[data-pm-draft-save]");
    expect(footerSource).toContain("action={completeAction}");
    expect(footerSource).toContain('type="submit"');
    expect(footerSource).toContain("ย้อนกลับ");
    expect(footerSource).toContain("ส่งใบงาน / เสร็จสิ้น");
  });

  it("does not render the redundant PM Work list below the worksheet", () => {
    expect(source).not.toContain("PM Work ภายใต้ Main Asset");
  });

  it("does not show Asset Family in the worksheet identity details", () => {
    expect(source).not.toContain(">Asset Family</dt>");
    expect(source).not.toContain("family: { select:");
  });

  it("uses custom Technical Field Template options in the inspection result column", () => {
    expect(source).toContain("optionsJson: true");
    expect(source).toContain("parseTechnicalOptions(");
    expect(source).toContain("field.optionsJson");
    expect(source).toContain("field.dataType");
    expect(source).toContain('type="radio"');
    expect(source).toContain("name={resultName}");
    expect(source).toContain("required={field.required}");
    expect(source).toContain("peer-checked:bg-emerald-600");
    expect(source).toContain("peer-checked:bg-red-500");
    expect(source).toContain("grid-flow-col auto-cols-fr");
    expect(source).toContain(
      "ผลตรวจสอบ ${checklist.assetName} ${field.labelTh}",
    );
  });

  it("renders a typed result input with the Technical Field Template unit when choices are absent", () => {
    expect(source).toContain(
      "กรอกผลตรวจสอบ ${checklist.assetName} ${field.labelTh}",
    );
    expect(source).toContain('field.dataType === "NUMBER"');
    expect(source).toContain('? "number"');
    expect(source).toContain("{field.unit}");
    expect(source).toContain("required={field.required}");
    expect(source).toContain("placeholder={");
    expect(source).toContain('field.helpText ?? "กรอกผลตรวจสอบ"');
    expect(source).not.toContain(
      '<th className="px-4 py-3">วิธีการตรวจสอบ / มาตรฐาน</th>',
    );
  });

  it("shows the configured indicator and captures optional other details for every field", () => {
    expect(source).toContain("indicatorText: true");
    expect(source).toContain("ดัชนีชี้วัด");
    expect(source).toContain('{field.indicatorText || "—"}');
    expect(source).not.toContain(">ค่าที่ตั้งไว้</th>");
    expect(source).toContain(
      "const otherName = pmCheckSheetOtherName(checklist.assetId, field)",
    );
    expect(source).toContain(
      "ข้อมูลอื่นๆ ${checklist.assetName} ${field.labelTh}",
    );
    expect(source).toContain('placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"');
    expect(source).toContain("worksheetValues[otherName] ??");
  });

  it("blocks submission and shows a Thai warning while any starred checklist field is empty", () => {
    expect(footerSource).toContain("form.checkValidity()");
    expect(footerSource).toContain("event.preventDefault()");
    expect(footerSource).toContain("กรุณาใส่ข้อมูลให้ครบ");
    expect(footerSource).toContain("invalidForm.reportValidity()");
  });

  it("shows the work summary, note counter, and optional image attachment below the checklist", () => {
    expect(source).toContain("<PmWorksheetSummaryForm");
    expect(source).toContain("completionFormId={completionFormId}");
    expect(source).toContain(
      'defaultResult={completed ? (mainWork?.result ?? "") : ""}',
    );
    expect(source).toContain('data.get("summaryResult") ?? ""');
    expect(source).toContain("กรุณาเลือกสรุปผลการปฏิบัติงาน");
    expect(summarySource).toContain("form={completionFormId}");
    expect(summarySource).toContain('defaultResult = ""');
    expect(summarySource).toContain('name="summaryNote"');
    expect(summarySource).toContain("สรุปผลการปฏิบัติงาน");
    expect(summarySource).toContain("เสร็จสิ้น (ปกติ)");
    expect(summarySource).toContain("ไม่สามารถดำเนินการได้");
    expect(summarySource).toContain("maxLength={500}");
    expect(summarySource).toContain('accept="image/jpeg,image/png"');
    expect(summarySource).toContain("ไม่เกิน 10 MB");
    expect(summarySource).toContain("รูปภาพเพิ่มเติม");
    expect(summarySource).toContain("สูงสุด 5 รูป");
    expect(summarySource).toContain("URL.createObjectURL");
    expect(summarySource).toContain("5 - current.length");
    expect(summarySource).toContain("แนบแล้ว {previews.length}/5 รูป");
    expect(summarySource).toContain('className="relative size-32 shrink-0"');
    expect(summarySource).toContain("flex size-32 shrink-0");
    expect(summarySource).toContain("function removeImage(index: number)");
    expect(summarySource).toContain("ลบรูป ${preview.name}");
    expect(summarySource).toContain("onClick={() => removeImage(index)}");
  });
});
