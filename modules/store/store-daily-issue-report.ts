export type DailyIssueMovement = {
  occurredAt: Date;
  quantityChange: number;
  unitPrice: number | null;
  store: { id: string; code: string; name: string };
  sparePart: {
    id: string;
    itemKind: string;
    code: string;
    itemCode: string | null;
    name: string;
    unit: string;
    minStock: number;
    latestUnitPrice: number | null;
    categoryName: string | null;
    materialGroupName: string | null;
  };
};

export type DailyIssueReportRow = Record<string, string | number>;

const fixedColumns = [
  "Store Code", "Store Name", "Item Type", "Item Code", "Item Name", "Category",
  "Material Group", "Quantity", "Minimum", "Unit", "Unit Price", "Total Value",
];

export function dailyIssueReportColumns(range: { start: Date; end: Date }) {
  return [...fixedColumns, ...enumerateBangkokDateKeys(range.start, range.end).map(dateColumnLabel)];
}

export function buildDailyIssueReportRows(
  movements: DailyIssueMovement[],
  range: { start: Date; end: Date },
): DailyIssueReportRow[] {
  const dateKeys = enumerateBangkokDateKeys(range.start, range.end);
  const dateKeySet = new Set(dateKeys);
  const groups = new Map<string, {
    storeCode: string;
    storeName: string;
    itemKind: string;
    itemCode: string;
    itemName: string;
    category: string;
    materialGroup: string;
    minimum: number;
    unit: string;
    unitPrice: number;
    quantity: number;
    totalValue: number;
    daily: Map<string, number>;
  }>();

  for (const movement of movements) {
    const dateKey = bangkokDateKey(movement.occurredAt);
    if (!dateKeySet.has(dateKey)) continue;
    const key = `${movement.store.id}:${movement.sparePart.id}`;
    const quantity = Math.abs(Number(movement.quantityChange));
    const movementPrice = movement.unitPrice ?? movement.sparePart.latestUnitPrice ?? 0;
    const current = groups.get(key) ?? {
      storeCode: movement.store.code,
      storeName: movement.store.name,
      itemKind: movement.sparePart.itemKind,
      itemCode: movement.sparePart.itemCode || movement.sparePart.code,
      itemName: movement.sparePart.name,
      category: movement.sparePart.categoryName ?? "-",
      materialGroup: movement.sparePart.materialGroupName ?? "-",
      minimum: Number(movement.sparePart.minStock),
      unit: movement.sparePart.unit,
      unitPrice: Number(movementPrice),
      quantity: 0,
      totalValue: 0,
      daily: new Map<string, number>(),
    };
    current.quantity += quantity;
    current.totalValue += quantity * Number(movementPrice);
    if (movement.unitPrice != null) current.unitPrice = Number(movement.unitPrice);
    current.daily.set(dateKey, (current.daily.get(dateKey) ?? 0) + quantity);
    groups.set(key, current);
  }

  return [...groups.values()]
    .sort((left, right) => left.storeCode.localeCompare(right.storeCode) || left.itemCode.localeCompare(right.itemCode))
    .map((group) => {
      const row: DailyIssueReportRow = {
        "Store Code": group.storeCode,
        "Store Name": group.storeName,
        "Item Type": group.itemKind,
        "Item Code": group.itemCode,
        "Item Name": group.itemName,
        Category: group.category,
        "Material Group": group.materialGroup,
        Quantity: roundReportNumber(group.quantity),
        Minimum: roundReportNumber(group.minimum),
        Unit: group.unit,
        "Unit Price": roundReportNumber(group.unitPrice),
        "Total Value": roundReportNumber(group.totalValue),
      };
      for (const dateKey of dateKeys) row[dateColumnLabel(dateKey)] = roundReportNumber(group.daily.get(dateKey) ?? 0);
      return row;
    });
}

export function enumerateBangkokDateKeys(start: Date, end: Date) {
  const first = bangkokDateKey(start);
  const last = bangkokDateKey(end);
  if (first > last) return [];
  const cursor = new Date(`${first}T00:00:00.000Z`);
  const final = new Date(`${last}T00:00:00.000Z`);
  const keys: string[] = [];
  while (cursor <= final) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function bangkokDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateColumnLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `วันที่ ${day}/${month}/${year}`;
}

function roundReportNumber(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
