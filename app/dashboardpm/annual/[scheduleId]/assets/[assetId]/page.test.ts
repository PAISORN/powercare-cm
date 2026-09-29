import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/dashboardpm/annual/[scheduleId]/assets/[assetId]/page.tsx", "utf8");
const listSource = readFileSync("app/dashboardpm/annual/[scheduleId]/page.tsx", "utf8");
const summarySource = readFileSync("components/pm/pm-worksheet-summary-form.tsx", "utf8");
const draftSource = readFileSync("components/pm/pm-sub-asset-draft-button.tsx", "utf8");
const footerSource = readFileSync("components/pm/pm-worksheet-footer.tsx", "utf8");

describe("Annual PM Main Asset worksheet", () => {
  it("opens a worksheet from every Main Asset card", () => {
    expect(listSource).toContain("/assets/${asset.id}?");
    expect(listSource).toContain("เปิดใบงาน PM ของ");
  });

  it("shows aggregate PM progress on every Main Asset card", () => {
    expect(listSource).toContain('statuses.every((status) => status === "COMPLETED")');
    expect(listSource).toContain('status === "IN_PROGRESS" || status === "COMPLETED"');
    expect(listSource).toContain("ยังไม่ได้ดำเนินการ");
    expect(listSource).toContain("กำลังดำเนินการ");
    expect(listSource).toContain("ดำเนินการเสร็จสิ้น");
    expect(listSource).toContain("progress.completed ? <CheckCircle2");
  });

  it("renders wide Main Asset cards with target, image, assignees, and status", () => {
    expect(listSource).toContain("data-pm-main-asset-card");
    expect(listSource).toContain("md:grid-cols-2 xl:grid-cols-4");
    expect(listSource).toContain("lg:h-[156px]");
    expect(listSource).toContain("grid-cols-[minmax(8.5rem,46%)_minmax(0,1fr)]");
    expect(listSource).toContain("aspect-[4/3]");
    expect(listSource).toContain("imageStoragePath");
    expect(listSource).toContain("title={targetName}");
    expect(listSource).toContain("assignees:");
    expect(listSource).toContain("<UserAvatar");
    expect(listSource).toContain("pmTargetColor(asset.code ?? asset.id).borderColor");
    expect(listSource).toContain('style={{ "--activity-color": assetColor } as CSSProperties}');
    expect(listSource).not.toContain(">Asset code</p>");
    expect(listSource).not.toContain("PM Works</span>");
    expect(listSource).not.toContain(">ผู้รับผิดชอบ</p>");
  });

  it("loads Asset identity, image, technical templates, values, and annual PM works", () => {
    expect(source).toContain('assetLevel: "MAIN_ASSET"');
    expect(source).toContain("imageStoragePath: true");
    expect(source).toContain("technicalValues:");
    expect(source).toContain("fields:");
    expect(source).toContain("annualSources: { some: { scheduleId: schedule.id } }");
  });

  it("renders the Technical Field Templates as the PM check sheet", () => {
    expect(source).toContain("checklistAssets.map");
    expect(source).toContain("checklistAsset.assetType?.fields");
    expect(source).toContain("displayValue(currentValue?.value");
  });

  it("groups check sheets by active Sub Assets from the Main Asset hierarchy", () => {
    expect(source).toContain('where: { assetLevel: "SUB_ASSET", registrationStatus: "ACTIVE" }');
    expect(source).toContain("const checklistAssets = asset.children.length ? asset.children : [asset]");
    expect(source).toContain('{isSubAsset ? "Sub Asset" : "Main Asset"}');
    expect(source).toContain("result_${checklistAsset.id}_${field.id}");
  });

  it("centers the result heading and saves a recoverable local draft per Sub Asset", () => {
    expect(source).toContain('className="w-80 px-4 py-3 text-center">ผลตรวจสอบ');
    expect(source).toContain("pm-worksheet:${schedule.id}:${checklistAsset.id}");
    expect(source).toContain("<PmSubAssetDraftButton");
    expect(draftSource).toContain("window.localStorage.setItem");
    expect(draftSource).toContain("window.localStorage.getItem");
    expect(draftSource).toContain("บันทึกร่าง");
  });

  it("renders bottom worksheet actions and saves every Sub Asset draft together", () => {
    expect(source).toContain("<PmWorksheetFooter");
    expect(source).toContain("completeHref={mainWork");
    expect(draftSource).toContain("data-pm-draft-save");
    expect(footerSource).toContain("[data-pm-draft-save]");
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
    expect(source).toContain("parseTechnicalOptions(field.optionsJson, field.dataType)");
    expect(source).toContain('type="radio"');
    expect(source).toContain("name={resultName}");
    expect(source).toContain("peer-checked:bg-emerald-600");
    expect(source).toContain("peer-checked:bg-red-500");
    expect(source).toContain("grid-flow-col auto-cols-fr");
    expect(source).toContain("ผลตรวจสอบ ${checklistAsset.nameTh} ${field.labelTh}");
  });

  it("renders a typed result input with the Technical Field Template unit when choices are absent", () => {
    expect(source).toContain("กรอกผลตรวจสอบ ${checklistAsset.nameTh} ${field.labelTh}");
    expect(source).toContain('field.dataType === "NUMBER" ? "number"');
    expect(source).toContain("{field.unit}</span>");
    expect(source).toContain("required={field.required}");
    expect(source).toContain('placeholder={field.helpText ?? "กรอกผลตรวจสอบ"}');
    expect(source).not.toContain('<th className="px-4 py-3">วิธีการตรวจสอบ / มาตรฐาน</th>');
  });

  it("shows the work summary, note counter, and optional image attachment below the checklist", () => {
    expect(source).toContain("<PmWorksheetSummaryForm />");
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
