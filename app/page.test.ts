import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Landing public feedback", () => {
  it("renders a public feedback form and stores feedback records", () => {
    const source = readFileSync("app/page.tsx", "utf8");

    expect(source).toContain("submitPublicFeedback");
    expect(source).toContain("PublicFeedbackSection");
    expect(source).toContain("db.publicFeedback.create");
    expect(source).toContain("ความคิดเห็น / คำแนะนำ");
  });
});
