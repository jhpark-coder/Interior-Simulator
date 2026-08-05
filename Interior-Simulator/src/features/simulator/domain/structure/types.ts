export type Vec2 = {
  x: number;
  y: number;
};

export type SourceOrigin = "detected" | "manual" | "default" | "migrated";

export type SourceInfo = {
  origin: SourceOrigin;
  confidence?: number;
  confirmedByUser: boolean;
};

export type WallKind = "exterior" | "interior" | "partition";

export type Wall = {
  id: string;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  kind: WallKind;
  color?: string;
  source: SourceInfo;
};

export type RoomUsage =
  | "living"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "balcony"
  | "hallway"
  | "utility"
  | "other";

export type RoomRegion = {
  id: string;
  name: string;
  polygon: Vec2[];
  wallIds: string[];
  usage: RoomUsage;
  floorColor?: string;
  source: SourceInfo;
};

export type OpeningKind = "door" | "window" | "passage";
export type StructureDoorType = "swing" | "sliding";
export type StructureDoorHinge = "left" | "right";
export type StructureDoorSwing = "inward" | "outward";
export type StructureDoorSlideDirection = "left" | "right";

export type Opening = {
  id: string;
  kind: OpeningKind;
  wallId: string;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
  doorType?: StructureDoorType;
  hinge?: StructureDoorHinge;
  swing?: StructureDoorSwing;
  slideDirection?: StructureDoorSlideDirection;
  openAngle?: number;
  thickness?: number;
  color?: string;
  source: SourceInfo;
};

export type FloorStructure = {
  id: string;
  name: string;
  elevation: number;
  ceilingHeight: number;
  walls: Wall[];
  rooms: RoomRegion[];
  openings: Opening[];
};

export type StructureIssueCode =
  | "wall-too-short"
  | "wall-self-loop"
  | "duplicate-wall"
  | "wall-crossing"
  | "dangling-endpoint"
  | "opening-wall-missing"
  | "opening-out-of-bounds"
  | "room-not-closed";

export type StructureIssue = {
  id: string;
  code: StructureIssueCode;
  severity: "warning" | "error";
  message: string;
  entityIds: string[];
  position?: Vec2;
};

export type WallEndpoint = "start" | "end";

export const MANUAL_SOURCE: SourceInfo = {
  origin: "manual",
  confirmedByUser: true,
};

export const DEFAULT_SOURCE: SourceInfo = {
  origin: "default",
  confirmedByUser: false,
};
