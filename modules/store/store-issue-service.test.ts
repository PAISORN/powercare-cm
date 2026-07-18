import { describe, expect, it } from "vitest";
import {
  approveStoreIssueByEngineer,
  createStoreIssueWithRepository,
  issueApprovedStoreIssue,
  issueStoreIssueQuantities,
  rejectStoreIssueByEngineer,
  returnStoreIssueForEdit,
  type StoreIssueRecord,
  type StoreIssueRepository,
} from "./store-issue-service";
import { StockMovementType, StoreIssueStatus, StoreIssueType } from "./store-types";

function createRepository(issue?: Partial<StoreIssueRecord>): StoreIssueRepository & {
  created: unknown[];
  statuses: unknown[];
  movements: unknown[];
  balances: Record<string, number>;
} {
  const record: StoreIssueRecord = {
    id: "issue-1",
    status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
    organizationId: "org-1",
    plantId: "site-rtb",
    items: [{ id: "item-1", storeId: "store-1", sparePartId: "part-1", zoneId: "zone-1", requestedQty: 2 }],
    ...issue,
  };
  return {
    created: [],
    statuses: [],
    movements: [],
    balances: { "store-1:part-1": 5 },
    async createIssue(input) {
      this.created.push(input);
      return { id: "issue-1" };
    },
    async readIssue() {
      return record;
    },
    async updateIssueStatus(input) {
      record.status = input.status;
      this.statuses.push(input);
    },
    async updateIssueItem(input) {
      const item = record.items.find((entry) => entry.id === input.itemId);
      if (!item) throw new Error("Item not found");
      if (input.approvedQty !== undefined) item.approvedQty = input.approvedQty;
      if (input.issuedQty !== undefined) item.issuedQty = input.issuedQty;
    },
    async readAvailableStock(input) {
      return this.balances[`${input.storeId}:${input.sparePartId}`] ?? 0;
    },
    async addStock(input) {
      const key = `${input.storeId}:${input.sparePartId}`;
      this.balances[key] = (this.balances[key] ?? 0) + input.quantity;
      return { balanceAfter: this.balances[key] };
    },
    async createMovement(input) {
      this.movements.push(input);
    },
  };
}

describe("store issue service", () => {
  const scope = { organizationId: "org-1", plantId: "site-rtb", plantCode: "RTB" };
  const engineer = { id: "engineer-1", role: "ENGINEER", plantId: "site-rtb" };
  const storeOfficer = { id: "store-1", role: "STORE_OFFICER", plantId: "site-rtb" };

  it("creates issue waiting for engineer approval", async () => {
    const repository = createRepository();
    const result = await createStoreIssueWithRepository(repository, scope, {
      number: "SI-RTB-2026-07-0001",
      issueType: StoreIssueType.CM_REFERENCED,
      cmWorkId: "cm-1",
      requesterName: "Requester",
      requestedAt: new Date("2026-07-08T01:00:00.000Z"),
      items: [{ storeId: "store-1", sparePartId: "part-1", zoneId: "zone-1", requestedQty: 2 }],
    });

    expect(result).toEqual({ id: "issue-1" });
    expect(repository.created).toMatchObject([
      { status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL, number: "SI-RTB-2026-07-0001" },
    ]);
  });

  it("rejects a request above available stock", async () => {
    const repository = createRepository();
    repository.balances["store-1:part-1"] = 1;

    await expect(
      createStoreIssueWithRepository(repository, scope, {
        number: "SI-RTB-2026-07-0001",
        issueType: StoreIssueType.DIRECT,
        requesterName: "Requester",
        requestedAt: new Date(),
        items: [{ storeId: "store-1", sparePartId: "part-1", zoneId: "zone-1", requestedQty: 2 }],
      }),
    ).rejects.toThrow("exceeds available stock");
  });

  it("allows requesting the last item when available stock is exactly one", async () => {
    const repository = createRepository();
    repository.balances["store-1:part-1"] = 1;

    await expect(
      createStoreIssueWithRepository(repository, scope, {
        number: "SI-RTB-2026-07-0001",
        issueType: StoreIssueType.DIRECT,
        requesterName: "Requester",
        requestedAt: new Date(),
        items: [{ storeId: "store-1", sparePartId: "part-1", zoneId: "zone-1", requestedQty: 1 }],
      }),
    ).resolves.toEqual({ id: "issue-1" });
  });

  it("requires requested quantities to be positive whole numbers", async () => {
    const repository = createRepository();

    await expect(
      createStoreIssueWithRepository(repository, scope, {
        number: "SI-RTB-2026-07-0001",
        issueType: StoreIssueType.DIRECT,
        requesterName: "Requester",
        requestedAt: new Date(),
        items: [{ storeId: "store-1", sparePartId: "part-1", zoneId: "zone-1", requestedQty: 1.5 }],
      }),
    ).rejects.toThrow("positive whole number");
  });

  it("lets engineer approve or reject before store issue", async () => {
    const repository = createRepository();
    await approveStoreIssueByEngineer(repository, engineer, scope, "issue-1");
    expect(repository.statuses).toMatchObject([{ status: StoreIssueStatus.WAITING_STORE_ISSUE }]);

    const rejectRepository = createRepository();
    await rejectStoreIssueByEngineer(rejectRepository, engineer, scope, "issue-1", "Wrong item");
    expect(rejectRepository.statuses).toMatchObject([
      { status: StoreIssueStatus.ENGINEER_REJECTED, reason: "Wrong item" },
    ]);

    const returnRepository = createRepository();
    await returnStoreIssueForEdit(returnRepository, engineer, scope, "issue-1", "Please correct quantity");
    expect(returnRepository.statuses).toMatchObject([
      { status: StoreIssueStatus.RETURNED_FOR_EDIT, reason: "Please correct quantity" },
    ]);
  });

  it("issues stock when all items have enough stock", async () => {
    const repository = createRepository({ status: StoreIssueStatus.WAITING_STORE_ISSUE });
    const result = await issueApprovedStoreIssue(repository, storeOfficer, scope, "issue-1");

    expect(result).toEqual({ status: StoreIssueStatus.ISSUED });
    expect(repository.balances["store-1:part-1"]).toBe(3);
    expect(repository.movements).toMatchObject([
      { movementType: StockMovementType.ISSUE, quantityChange: -2, balanceAfter: 3 },
    ]);
    expect(repository.statuses).toMatchObject([{ status: StoreIssueStatus.ISSUED }]);
  });

  it("issues the last item and allows the stock balance to reach zero", async () => {
    const repository = createRepository({
      status: StoreIssueStatus.WAITING_STORE_ISSUE,
      items: [{
        id: "item-1",
        storeId: "store-1",
        sparePartId: "part-1",
        zoneId: "zone-1",
        requestedQty: 1,
        approvedQty: 1,
        issuedQty: 0,
      }],
    });
    repository.balances["store-1:part-1"] = 1;

    const result = await issueApprovedStoreIssue(repository, storeOfficer, scope, "issue-1");

    expect(result).toEqual({ status: StoreIssueStatus.ISSUED });
    expect(repository.balances["store-1:part-1"]).toBe(0);
    expect(repository.movements).toMatchObject([
      { movementType: StockMovementType.ISSUE, quantityChange: -1, balanceAfter: 0 },
    ]);
  });

  it("supports partial issue and completes the remaining quantity later", async () => {
    const repository = createRepository({
      status: StoreIssueStatus.WAITING_STORE_ISSUE,
      items: [{
        id: "item-1",
        storeId: "store-1",
        sparePartId: "part-1",
        zoneId: "zone-1",
        requestedQty: 4,
        approvedQty: 4,
        issuedQty: 0,
      }],
    });

    const partial = await issueStoreIssueQuantities(
      repository,
      storeOfficer,
      scope,
      "issue-1",
      [{ itemId: "item-1", quantity: 2 }],
    );
    expect(partial.status).toBe(StoreIssueStatus.PARTIALLY_ISSUED);
    expect(repository.balances["store-1:part-1"]).toBe(3);

    const completed = await issueStoreIssueQuantities(
      repository,
      storeOfficer,
      scope,
      "issue-1",
      [{ itemId: "item-1", quantity: 2 }],
    );
    expect(completed.status).toBe(StoreIssueStatus.ISSUED);
    expect(repository.balances["store-1:part-1"]).toBe(1);
  });

  it("requires issued quantities to be positive whole numbers", async () => {
    const repository = createRepository({ status: StoreIssueStatus.WAITING_STORE_ISSUE });

    await expect(
      issueStoreIssueQuantities(
        repository,
        storeOfficer,
        scope,
        "issue-1",
        [{ itemId: "item-1", quantity: 1.5 }],
      ),
    ).rejects.toThrow("approved remaining quantity");
  });

  it("rejects issue when stock is not enough", async () => {
    const repository = createRepository({ status: StoreIssueStatus.WAITING_STORE_ISSUE });
    repository.balances["store-1:part-1"] = 1;
    const result = await issueApprovedStoreIssue(repository, storeOfficer, scope, "issue-1");

    expect(result).toEqual({ status: StoreIssueStatus.NOT_ENOUGH_STOCK });
    expect(repository.balances["store-1:part-1"]).toBe(1);
    expect(repository.movements).toHaveLength(0);
    expect(repository.statuses).toMatchObject([
      { status: StoreIssueStatus.NOT_ENOUGH_STOCK, reason: "Not enough stock." },
    ]);
  });

  it("blocks cross-site issue operations", async () => {
    const repository = createRepository({ status: StoreIssueStatus.WAITING_STORE_ISSUE });
    await expect(
      issueApprovedStoreIssue(repository, { ...storeOfficer, plantId: "site-other" }, scope, "issue-1"),
    ).rejects.toThrow("outside the selected site scope");
  });
});
