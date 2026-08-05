import type { FurnitureType, ItemCategory } from "../types";

const CATEGORY_MAP: Record<FurnitureType, ItemCategory> = {
  bed: "furniture",
  desk: "furniture",
  chair: "furniture",
  closet: "furniture",
  "display-cabinet": "furniture",
  bookshelf: "furniture",
  sofa: "furniture",
  table: "furniture",
  custom: "furniture",
  refrigerator: "appliance",
  "washing-machine": "appliance",
  dryer: "appliance",
  dishwasher: "appliance",
  oven: "appliance",
  microwave: "appliance",
  tv: "electronics",
  "air-conditioner": "electronics",
  "air-purifier": "electronics",
  humidifier: "electronics",
  "monitor-stand": "electronics",
  "monitor-arm": "electronics",
  sink: "fixture",
  toilet: "fixture",
  bathtub: "fixture",
  shower: "fixture",
};

export function inferCategoryFromType(type: FurnitureType): ItemCategory {
  return CATEGORY_MAP[type];
}
