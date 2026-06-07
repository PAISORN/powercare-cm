export const initialCategories = ["งานไฟฟ้า", "งานเครื่องกล"] as const;

export const initialZones = [
  "Fuel preparation",
  "Fuel Warehouse",
  "Boiler&Combustion",
  "Turbine",
  "ESP",
  "Water Treatment Plant",
  "Cooling Tower",
  "Vehicle",
  "Office",
  "Other",
] as const;

export const defaultSla = {
  claimDays: 1,
  executionDays: 3,
  reviewDays: 2,
} as const;
