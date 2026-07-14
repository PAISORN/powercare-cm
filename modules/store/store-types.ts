export const SparePartCodePrefix = "SP";
export const SparePartIssuePrefix = "SI";

export const StoreIssueType = {
  CM_REFERENCED: "CM_REFERENCED",
  DIRECT: "DIRECT",
} as const;

export type StoreIssueType = (typeof StoreIssueType)[keyof typeof StoreIssueType];

export const StoreIssueStatus = {
  WAITING_ENGINEER_APPROVAL: "WAITING_ENGINEER_APPROVAL",
  ENGINEER_REJECTED: "ENGINEER_REJECTED",
  RETURNED_FOR_EDIT: "RETURNED_FOR_EDIT",
  WAITING_STORE_ISSUE: "WAITING_STORE_ISSUE",
  STORE_REJECTED: "STORE_REJECTED",
  NOT_ENOUGH_STOCK: "NOT_ENOUGH_STOCK",
  PARTIALLY_ISSUED: "PARTIALLY_ISSUED",
  ISSUED: "ISSUED",
  CANCELED: "CANCELED",
} as const;

export type StoreIssueStatus = (typeof StoreIssueStatus)[keyof typeof StoreIssueStatus];

export const StockMovementType = {
  RECEIVE: "RECEIVE",
  ISSUE: "ISSUE",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const SparePartReceiveStatus = {
  RECEIVED: "RECEIVED",
  CANCELED: "CANCELED",
} as const;

export type SparePartReceiveStatus = (typeof SparePartReceiveStatus)[keyof typeof SparePartReceiveStatus];

export type StoreScope = {
  organizationId: string;
  plantId: string;
  plantCode: string;
};
