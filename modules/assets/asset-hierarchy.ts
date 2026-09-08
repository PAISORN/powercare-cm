export const AssetLevel = { MAIN_ASSET: "MAIN_ASSET", SUB_ASSET: "SUB_ASSET", PART: "PART" } as const;
export type AssetLevel = typeof AssetLevel[keyof typeof AssetLevel];
export const ASSET_LEVELS = Object.values(AssetLevel);
const aliases: Record<string, string> = { "AC MOTOR": "Motor", PUMP: "Pump", GEAR: "Gearbox", "GEAR BOX": "Gearbox", GEARBOX: "Gearbox", "BELT CONVEYOR": "Conveyor", "FUEL BELT CONVEYOR": "Conveyor", "ROTARY AIR LOCK": "Rotary Air Lock", TANK: "Tank", MOTOR: "Motor" };
const systemNames = new Set(["Boiler & Combustion", "Water Treatment", "Fire Protection", "Fuel Preparation", "Ash Handling", "Cooling Water", "General Water", "Electrical Power", "Compressed Air", "Condensate & Feedwater"].map(s => s.toLowerCase()));
const instruments = new Set(["Pressure Transmitter", "Differential Pressure Transmitter", "Level Transmitter", "Temperature Transmitter", "Flow Transmitter", "Pressure Switch", "Level Switch", "Temperature Switch", "Flow Switch", "Vibration Sensor", "Speed Sensor", "Instrument"].map(s => s.toLowerCase()));
const parts = new Set(["Bearing", "Coupling", "Mechanical Seal", "Seal", "Filter", "Impeller", "Pulley", "Shaft", "Chain", "Belt", "Actuator"].map(s => s.toLowerCase()));
export function normalizeAssetTypeName(value: string): string { const name = value.trim().replace(/\s+/g, " "); return aliases[name.toUpperCase()] ?? name; }
export function isSystemAssetType(value: string): boolean { return systemNames.has(normalizeAssetTypeName(value).toLowerCase()) || /\bsystem$/i.test(value.trim()); }
export function isInstrumentType(value: string): boolean { return instruments.has(normalizeAssetTypeName(value).toLowerCase()); }
export function isValveType(value: string): boolean { return /\bvalve$/i.test(value.trim()); }
export function defaultAssetLevelForType(value: string): AssetLevel { const name = normalizeAssetTypeName(value); return isInstrumentType(name) || isValveType(name) || parts.has(name.toLowerCase()) ? AssetLevel.PART : ["motor", "gearbox"].includes(name.toLowerCase()) ? AssetLevel.SUB_ASSET : AssetLevel.MAIN_ASSET; }
export function cleanAssetName(value: string): string { return value.trim().replace(/\s+Z[0-9A-Za-z._-]+$/, ""); }
export function isValidAssetSystemName(value: string): boolean { return !!value.trim() && !/^instrument(?:\s+system)?$/i.test(value.trim()); }
export interface AssetHierarchyNode {
  id: string; plantId: string; systemId: string | null; parentId: string | null; assetLevel: string;
  nameTh?: string; nameEn?: string | null; assetTypeName?: string | null; discipline?: string | null; migrationStatus?: string;
}
/** Validates a candidate and edges affected by its mutation. Review status never bypasses normal saves. */
export function validateAssetHierarchy(input: AssetHierarchyNode, nodes: readonly AssetHierarchyNode[]): string[] {
  const errors = new Set<string>();
  const graph = new Map(nodes.map(n => [n.id, n])); graph.set(input.id, input);
  if (!ASSET_LEVELS.includes(input.assetLevel as AssetLevel)) errors.add("INVALID_LEVEL");
  if (!input.systemId) errors.add("SYSTEM_REQUIRED");
  for (const name of [input.nameTh, input.nameEn]) if (name && /\s+Z[0-9A-Za-z._-]+$/.test(name.trim())) errors.add("ZONE_SUFFIX");
  if (input.assetTypeName && isSystemAssetType(input.assetTypeName)) errors.add("INVALID_ASSET_TYPE");
  if ((isInstrumentType(input.assetTypeName ?? "") || input.discipline?.toLowerCase() === "instrument") && input.assetLevel !== AssetLevel.PART) errors.add("INSTRUMENT_MUST_BE_PART");
  if (isValveType(input.assetTypeName ?? "") && input.assetLevel !== AssetLevel.PART) errors.add("VALVE_MUST_BE_PART");
  function checkEdge(node: AssetHierarchyNode) {
    if (node.assetLevel === AssetLevel.MAIN_ASSET) { if (node.parentId) errors.add("INVALID_PARENT_LEVEL"); }
    else if (!node.parentId) errors.add("PARENT_REQUIRED");
    if (!node.parentId) return;
    const parent = graph.get(node.parentId);
    if (!parent) { errors.add("PARENT_NOT_FOUND"); return; }
    if (node.plantId !== parent.plantId) errors.add("CROSS_SITE_PARENT");
    if (!node.systemId || node.systemId !== parent.systemId) errors.add("CROSS_SYSTEM_PARENT");
    if (node.assetLevel === AssetLevel.SUB_ASSET && parent.assetLevel !== AssetLevel.MAIN_ASSET || node.assetLevel === AssetLevel.PART && ![AssetLevel.MAIN_ASSET, AssetLevel.SUB_ASSET].includes(parent.assetLevel as "MAIN_ASSET" | "SUB_ASSET")) errors.add("INVALID_PARENT_LEVEL");
  }
  checkEdge(input);
  for (const node of graph.values()) if (node.parentId === input.id) checkEdge(node);
  const visited = new Set<string>(); let current: AssetHierarchyNode | undefined = input;
  while (current) { if (visited.has(current.id)) { errors.add("CYCLE"); break; } visited.add(current.id); current = current.parentId ? graph.get(current.parentId) : undefined; }
  return [...errors];
}
