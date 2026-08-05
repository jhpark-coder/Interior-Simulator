import type { FloorPlanSource } from "../import";
import type { MemoryPin, SavedViewpoint } from "../memory";
import type { Scenario } from "../scenario";
import type { FloorStructure, SourceOrigin } from "../structure";

export type ProjectAssetKind = "floorplan" | "photo" | "texture" | "thumbnail";

export type ProjectAsset = {
  id: string;
  kind: ProjectAssetKind;
  fileName: string;
  mimeType: string;
  size: number;
  parentAssetId?: string;
  createdAt: string;
};

export type StructureRevision = {
  id: string;
  name: string;
  parentRevisionId?: string;
  origin: SourceOrigin;
  structure: FloorStructure;
  createdAt: string;
};

export type InteriorProject = {
  version: "2.0.0";
  id: string;
  name: string;
  sources: FloorPlanSource[];
  assets: ProjectAsset[];
  structureRevisions: StructureRevision[];
  activeStructureRevisionId: string;
  scenarios: Scenario[];
  activeScenarioId: string;
  memoryPins: MemoryPin[];
  savedViewpoints: SavedViewpoint[];
  meta: {
    createdAt: string;
    updatedAt: string;
  };
};
