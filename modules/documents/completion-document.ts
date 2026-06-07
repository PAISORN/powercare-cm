import { WorkStatus } from "../cm-work/cm-work-types";

export function canRenderCompletionDocument(status: string) {
  return status === WorkStatus.CLOSED;
}
