import { describe, expect, it } from "vitest";
import { WorkStatus } from "../cm-work/cm-work-types";
import { canRenderCompletionDocument } from "./completion-document";

describe("canRenderCompletionDocument", () => {
  it("renders only closed work", () => {
    expect(canRenderCompletionDocument(WorkStatus.CLOSED)).toBe(true);
    expect(canRenderCompletionDocument(WorkStatus.CANCELED)).toBe(false);
    expect(canRenderCompletionDocument(WorkStatus.WAITING_TO_CLOSE)).toBe(false);
  });
});
