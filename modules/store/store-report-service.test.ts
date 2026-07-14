import { describe, expect, it } from "vitest";
import {
  buildStoreIssueLineMessage,
  summarizeStockBalances,
  summarizeStockMovements,
  summarizeStoreIssues,
} from "./store-report-service";
import { StoreIssueStatus } from "./store-types";

describe("store report service", () => {
  it("summarizes store issues by status and category", () => {
    const summary = summarizeStoreIssues([
      {
        id: "1",
        number: "SI-RTB-2026-07-0001",
        status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
        categoryName: "Bearing",
        requestedAt: new Date(),
      },
      {
        id: "2",
        number: "SI-RTB-2026-07-0002",
        status: StoreIssueStatus.WAITING_STORE_ISSUE,
        categoryName: "Bearing",
        requestedAt: new Date(),
      },
      {
        id: "3",
        number: "SI-RTB-2026-07-0003",
        status: StoreIssueStatus.ISSUED,
        categoryName: "Electrical",
        requestedAt: new Date(),
      },
      {
        id: "4",
        number: "SI-RTB-2026-07-0004",
        status: StoreIssueStatus.STORE_REJECTED,
        categoryName: null,
        requestedAt: new Date(),
      },
    ]);

    expect(summary).toMatchObject({
      total: 4,
      waitingEngineerApproval: 1,
      waitingStoreIssue: 1,
      issued: 1,
      rejected: 1,
    });
    expect(summary.byCategory).toEqual([
      { categoryName: "Bearing", total: 2 },
      { categoryName: "Electrical", total: 1 },
      { categoryName: "ไม่ระบุหมวดหมู่", total: 1 },
    ]);
  });

  it("summarizes stock balance, value, and low-stock items", () => {
    const summary = summarizeStockBalances([
      {
        id: "stock-1",
        quantity: 3,
        storeName: "Main Store",
        sparePartCode: "SP-RTB-00001",
        sparePartName: "Bearing",
        unit: "pcs",
        minStock: 5,
        latestUnitPrice: 120,
        categoryName: "Mechanical",
      },
      {
        id: "stock-2",
        quantity: 8,
        storeName: "Main Store",
        sparePartCode: "SP-RTB-00002",
        sparePartName: "Fuse",
        unit: "pcs",
        minStock: 2,
        latestUnitPrice: 50,
        categoryName: null,
      },
    ]);

    expect(summary.totalItems).toBe(2);
    expect(summary.totalQuantity).toBe(11);
    expect(summary.totalValue).toBe(760);
    expect(summary.lowStockItems).toEqual([
      {
        id: "stock-1",
        quantity: 3,
        minStock: 5,
        storeName: "Main Store",
        sparePartCode: "SP-RTB-00001",
        sparePartName: "Bearing",
        unit: "pcs",
      },
    ]);
    expect(summary.byCategory).toEqual([
      { categoryName: "Mechanical", totalItems: 1, totalQuantity: 3, totalValue: 360 },
      { categoryName: "ไม่ระบุหมวดหมู่", totalItems: 1, totalQuantity: 8, totalValue: 400 },
    ]);
  });

  it("summarizes stock movements by receive, issue, and adjustment direction", () => {
    const summary = summarizeStockMovements([
      { movementType: "RECEIVE", quantityChange: 10, occurredAt: new Date("2026-07-01T00:00:00Z") },
      { movementType: "ISSUE", quantityChange: -4, occurredAt: new Date("2026-07-02T00:00:00Z") },
      { movementType: "ADJUSTMENT", quantityChange: 2, occurredAt: new Date("2026-07-03T00:00:00Z") },
      { movementType: "ADJUSTMENT", quantityChange: -1, occurredAt: new Date("2026-07-04T00:00:00Z") },
    ]);

    expect(summary).toEqual({
      totalMovements: 4,
      receivedQuantity: 10,
      issuedQuantity: 4,
      adjustmentInQuantity: 2,
      adjustmentOutQuantity: 1,
    });
  });

  it("builds LINE-ready store issue message", () => {
    expect(
      buildStoreIssueLineMessage({
        eventType: "STORE_ISSUE_CREATED",
        issueNumber: "SI-RTB-2026-07-0001",
        statusLabel: "รอ Engineer อนุมัติ",
        requesterName: "Somchai",
        siteName: "RTB",
        itemCount: 3,
      }),
    ).toContain("เลขที่เบิก: SI-RTB-2026-07-0001");
  });
});
