export type AssetTechnicalFieldInputDefinition = {
  id: string;
  dataType: string;
  helpText: string | null;
  required: boolean;
  optionsJson: string | null;
};

export const assetRegistrationInputClass =
  "min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

export function AssetTechnicalFieldInput({
  field,
  defaultValue = "",
}: {
  field: AssetTechnicalFieldInputDefinition;
  defaultValue?: string;
}) {
  const options = parseAssetTechnicalOptions(field.optionsJson, field.dataType);
  return (
    <>
      {field.dataType === "SELECT" || field.dataType === "BOOLEAN" ? (
        <select
          className={assetRegistrationInputClass}
          defaultValue={defaultValue}
          name={`tech_${field.id}`}
          required={field.required}
        >
          <option value="">เลือกตัวเลือก</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={assetRegistrationInputClass}
          defaultValue={defaultValue}
          name={`tech_${field.id}`}
          placeholder={field.helpText || undefined}
          required={field.required}
          type={
            field.dataType === "NUMBER"
              ? "number"
              : field.dataType === "DATE"
                ? "date"
                : "text"
          }
        />
      )}
      {field.helpText ? (
        <span className="text-xs font-normal text-[var(--muted)]">
          {field.helpText}
        </span>
      ) : null}
    </>
  );
}

export function parseAssetTechnicalOptions(
  optionsJson: string | null,
  dataType: string,
) {
  if (dataType === "BOOLEAN" && !optionsJson) return ["ใช่", "ไม่ใช่"];
  try {
    const options = JSON.parse(optionsJson || "null");
    return Array.isArray(options)
      ? options.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
