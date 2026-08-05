import type { FurnitureItem } from "../../types";

export type MaterialSurface =
  | "wall"
  | "floor"
  | "ceiling"
  | "door"
  | "window";

export type MaterialAssignment = {
  id: string;
  targetId: string;
  surface: MaterialSurface;
  color?: string;
  textureAssetId?: string;
  roughness?: number;
};

export type Scenario = {
  id: string;
  name: string;
  structureRevisionId: string;
  furniture: FurnitureItem[];
  materials: MaterialAssignment[];
  createdAt: string;
  updatedAt: string;
};
