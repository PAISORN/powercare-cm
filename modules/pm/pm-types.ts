export const PmPlanStatus = {
  DRAFT: "DRAFT",
  CONFIRMED: "CONFIRMED",
  CANCELED: "CANCELED",
} as const;

export type PmPlanStatus = (typeof PmPlanStatus)[keyof typeof PmPlanStatus];

export const PmWorkStatus = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
} as const;

export type PmWorkStatus = (typeof PmWorkStatus)[keyof typeof PmWorkStatus];

export const PmResult = {
  NORMAL: "NORMAL",
  ABNORMAL: "ABNORMAL",
} as const;

export type PmResult = (typeof PmResult)[keyof typeof PmResult];

export const PmAssigneeRole = {
  LEAD: "LEAD",
  COLLABORATOR: "COLLABORATOR",
} as const;

export type PmAssigneeRole = (typeof PmAssigneeRole)[keyof typeof PmAssigneeRole];
