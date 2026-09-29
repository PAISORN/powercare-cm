import type { Prisma } from "@prisma/client";
import type { StoreIssueRepository } from "./store-issue-service";
import { StoreIssueStatus } from "./store-types";
import { optionalText } from "./store-issue-values";

export function createIssueRepository(tx: Prisma.TransactionClient): StoreIssueRepository {
  return {
    async createIssue(input) {
      return tx.sparePartIssue.create({
        data: {
          number: input.number,
          submissionKey: input.submissionKey ?? null,
          organizationId: input.scope.organizationId,
          plantId: input.scope.plantId,
          cmWorkId: input.cmWorkId,
          issueType: input.issueType,
          status: input.status,
          requesterName: input.requesterName,
          requesterDepartment: input.requesterDepartment,
          requesterContact: input.requesterContact,
          vehicle: input.vehicle,
          odometerBefore: input.odometerBefore,
          odometerAfter: input.odometerAfter,
          dispenserMeterBefore: input.dispenserMeterBefore,
          dispenserMeterAfter: input.dispenserMeterAfter,
          requesterUserId: input.requesterUserId,
          note: input.note,
          requestedAt: input.requestedAt,
          items: {
            create: input.items.map((item) => ({
              lineNumber: item.lineNumber,
              storeId: item.storeId,
              sparePartId: item.sparePartId,
              zoneId: item.zoneId,
              zoneCode: item.zoneCode,
              requestedQty: item.requestedQty,
              note: optionalText(item.note),
            })),
          },
        },
        select: { id: true },
      });
    },
    async readIssue(issueId) {
      const issue = await tx.sparePartIssue.findUnique({
        where: { id: issueId },
        select: {
          id: true,
          status: true,
          plantId: true,
          organizationId: true,
          requesterUserId: true,
          items: {
            select: {
              id: true,
              lineNumber: true,
              storeId: true,
              sparePartId: true,
              zoneId: true,
              zoneCode: true,
              requestedQty: true,
              approvedQty: true,
              issuedQty: true,
            },
          },
        },
      });
      return issue
        ? {
            ...issue,
            items: issue.items.map((item) => ({
              ...item,
              requestedQty: Number(item.requestedQty),
              approvedQty: item.approvedQty == null ? null : Number(item.approvedQty),
              issuedQty: item.issuedQty == null ? null : Number(item.issuedQty),
            })),
          }
        : null;
    },
    async updateIssueStatus(input) {
      const isEngineerAction = [
        StoreIssueStatus.WAITING_STORE_ISSUE,
        StoreIssueStatus.ENGINEER_REJECTED,
        StoreIssueStatus.RETURNED_FOR_EDIT,
      ].includes(input.status as never);
      const isStoreAction = [
        StoreIssueStatus.PARTIALLY_ISSUED,
        StoreIssueStatus.ISSUED,
        StoreIssueStatus.NOT_ENOUGH_STOCK,
        StoreIssueStatus.STORE_REJECTED,
      ].includes(input.status as never);
      await tx.sparePartIssue.update({
        where: { id: input.issueId },
        data: {
          status: input.status,
          rejectReason: input.reason ?? null,
          ...(isEngineerAction ? { engineerId: input.actorId } : {}),
          ...(input.status === StoreIssueStatus.WAITING_STORE_ISSUE
            ? { engineerApprovedAt: input.changedAt, rejectedAt: null }
            : {}),
          ...(input.status === StoreIssueStatus.ENGINEER_REJECTED
            ? { rejectedAt: input.changedAt }
            : {}),
          ...(isStoreAction ? { storeOfficerId: input.actorId } : {}),
          ...(input.status === StoreIssueStatus.ISSUED ? { issuedAt: input.changedAt } : {}),
          ...(input.status === StoreIssueStatus.NOT_ENOUGH_STOCK ||
          input.status === StoreIssueStatus.STORE_REJECTED ||
          input.status === StoreIssueStatus.CANCELED
            ? { rejectedAt: input.changedAt }
            : {}),
        },
      });
    },
    async updateIssueItem(input) {
      await tx.sparePartIssueItem.update({
        where: { id: input.itemId },
        data: {
          ...(input.approvedQty !== undefined ? { approvedQty: input.approvedQty } : {}),
          ...(input.issuedQty !== undefined ? { issuedQty: input.issuedQty } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
    },
    async readAvailableStock(input) {
      const stock = await tx.storeStock.findUnique({
        where: {
          storeId_sparePartId: {
            storeId: input.storeId,
            sparePartId: input.sparePartId,
          },
        },
        select: { quantity: true },
      });
      return Number(stock?.quantity ?? 0);
    },
    async addStock(input) {
      if (input.quantity >= 0) throw new Error("Store issue must decrease stock.");
      const updated = await tx.storeStock.updateMany({
        where: {
          storeId: input.storeId,
          sparePartId: input.sparePartId,
          plantId: input.scope.plantId,
          quantity: { gte: Math.abs(input.quantity) },
        },
        data: { quantity: { increment: input.quantity } },
      });
      if (updated.count !== 1) throw new Error("Not enough stock.");
      const stock = await tx.storeStock.findUniqueOrThrow({
        where: {
          storeId_sparePartId: {
            storeId: input.storeId,
            sparePartId: input.sparePartId,
          },
        },
        select: { quantity: true },
      });
      return { balanceAfter: Number(stock.quantity) };
    },
    async createMovement(input) {
      const sparePart = await tx.sparePart.findUniqueOrThrow({
        where: { id: input.sparePartId },
        select: { latestUnitPrice: true },
      });
      await tx.stockMovement.create({
        data: {
          organizationId: input.scope.organizationId,
          plantId: input.scope.plantId,
          storeId: input.storeId,
          sparePartId: input.sparePartId,
          actorId: input.actorId,
          movementType: input.movementType,
          refType: input.refType,
          refId: input.refId,
          quantityChange: input.quantityChange,
          balanceAfter: input.balanceAfter,
          unitPrice: sparePart.latestUnitPrice,
          occurredAt: input.occurredAt,
        },
      });
    },
  };
}
