import { INVENTORY_ITEM_KINDS } from "../modules/store/inventory-user-scope";

export function InventoryUserScopeFields({
  responsibilityKinds,
  approvalKinds,
}: {
  responsibilityKinds: string[];
  approvalKinds: string[];
}) {
  const labels: Record<string, string> = {
    SPARE_PART: "อะไหล่",
    CHEMICAL: "สารเคมี",
    OIL: "น้ำมัน",
  };
  const group = (
    name: string,
    title: string,
    selectedKinds: string[],
    dataAttribute: string,
  ) => {
    const selected = new Set(selectedKinds);
    return (
      <fieldset
        className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
        {...{ [dataAttribute]: "true" }}
      >
        <legend className="px-2 text-sm font-bold">{title}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {INVENTORY_ITEM_KINDS.map((kind) => (
            <label
              className="flex items-center justify-between rounded-lg bg-[var(--soft)] px-3 py-2 text-sm font-semibold"
              key={kind}
            >
              {labels[kind]}
              <input
                className="size-4 accent-[var(--primary)]"
                defaultChecked={selected.has(kind)}
                name={name}
                type="checkbox"
                value={kind}
              />
            </label>
          ))}
        </div>
      </fieldset>
    );
  };
  return (
    <div className="grid gap-3">
      {group(
        "inventoryResponsibility",
        "ประเภทสต็อกที่รับผิดชอบ",
        responsibilityKinds,
        "data-inventory-responsibility-control",
      )}
      {group(
        "inventoryApproval",
        "ประเภทใบเบิกที่อนุมัติ",
        approvalKinds,
        "data-inventory-approval-control",
      )}
    </div>
  );
}
