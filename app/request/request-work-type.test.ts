import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("repair request work type", () => {
  const pageSource = readFileSync("app/request/request-page-content.tsx", "utf8");
  const reviewSource = readFileSync("components/request-submit-button.tsx", "utf8");

  it("renders the required dropdown before Category with the shared labels", () => {
    const workTypeIndex = pageSource.indexOf('name="workType"');
    const categoryIndex = pageSource.indexOf('name="categoryId"');
    expect(workTypeIndex).toBeGreaterThan(-1);
    expect(categoryIndex).toBeGreaterThan(workTypeIndex);
    expect(pageSource).toContain("ประเภทงานที่แจ้ง");
    expect(pageSource).toContain("workTypeLabels");
  });

  it("parses and includes the selected work type in the confirmation dialog", () => {
    expect(pageSource).toContain('workType: formData.get("workType")');
    expect(reviewSource).toContain('workType: selectedOptionText(form, "workType")');
    expect(reviewSource).toContain('<ReviewItem label="ประเภทงานที่แจ้ง" value={review.workType} />');
  });
});
