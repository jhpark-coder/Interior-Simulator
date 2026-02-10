export type Unit = "mm" | "cm";
export type WallSide = "north" | "east" | "south" | "west";
export type DoorHinge = "left" | "right";
export type DoorSwing = "inward" | "outward";
export type ViewMode = "2d" | "3d" | "split";
export type DimensionHorizontalSide = "top" | "bottom";
export type DimensionVerticalSide = "left" | "right";
export type DimensionPlacement = {
  horizontalSide: DimensionHorizontalSide;
  verticalSide: DimensionVerticalSide;
};

export type Room = {
  width: number;
  height: number;
  wallThickness: number;
  ceilingHeight: number;
  gridSize: number;
  snapEnabled: boolean;
  displayUnit: Unit;
};

export type ItemCategory = "furniture" | "appliance" | "electronics" | "fixture";

export type FurnitureType =
  // Furniture
  | "bed" | "desk" | "chair" | "closet" | "sofa" | "table"
  // Appliances
  | "refrigerator" | "washing-machine" | "dryer" | "dishwasher" | "oven" | "microwave"
  // Electronics
  | "tv" | "air-conditioner" | "air-purifier" | "humidifier"
  // Fixtures
  | "sink" | "toilet" | "bathtub" | "shower";

export type FurnitureItem = {
  id: string;
  type: FurnitureType;
  category: ItemCategory;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color?: string;
  zIndex: number;
  locked: boolean;
};

export type ItemDefinition = {
  id: string;
  type: FurnitureType;
  category: ItemCategory;
  label: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  tags: string[];
  keywords: string[];
};

export type Door = {
  id: string;
  wall: WallSide;
  offset: number;
  width: number;
  height: number;
  hinge: DoorHinge;
  swing: DoorSwing;
  openAngle: number;
  thickness: number;
};

export type Window = {
  id: string;
  wall: WallSide;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
};

export type LayoutDoc = {
  version: "1.1.0";
  room: Room;
  furniture: FurnitureItem[];
  doors: Door[];
  windows: Window[];
  meta: {
    createdAt: string;
    updatedAt: string;
  };
};

export type SelectedEntity =
  | { kind: "room" }
  | { kind: "furniture" | "door" | "window"; id: string }
  | null;
