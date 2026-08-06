import type { Door, LayoutDoc, WallSide, Window } from "../../types";
import type { InteriorProject } from "../../domain/project";
import type { FloorStructure, Opening, RoomRegion, SourceInfo, Wall } from "../../domain/structure";

const MIGRATED_SOURCE: SourceInfo = {
  origin: "migrated",
  confirmedByUser: true,
};

const LEGACY_WALL_IDS: Record<WallSide, string> = {
  north: "legacy-wall-north",
  east: "legacy-wall-east",
  south: "legacy-wall-south",
  west: "legacy-wall-west",
};

function createLegacyWalls(layout: LayoutDoc): Wall[] {
  const { width, height, wallThickness, ceilingHeight, wallColor } = layout.room;
  const common = {
    thickness: wallThickness,
    height: ceilingHeight,
    kind: "exterior" as const,
    color: wallColor,
    source: { ...MIGRATED_SOURCE },
  };
  return [
    {
      ...common,
      id: LEGACY_WALL_IDS.north,
      start: { x: 0, y: 0 },
      end: { x: width, y: 0 },
    },
    {
      ...common,
      id: LEGACY_WALL_IDS.east,
      start: { x: width, y: 0 },
      end: { x: width, y: height },
    },
    {
      ...common,
      id: LEGACY_WALL_IDS.south,
      start: { x: 0, y: height },
      end: { x: width, y: height },
    },
    {
      ...common,
      id: LEGACY_WALL_IDS.west,
      start: { x: 0, y: 0 },
      end: { x: 0, y: height },
    },
  ];
}

function createLegacyRoom(layout: LayoutDoc): RoomRegion {
  const { width, height, floorColor } = layout.room;
  return {
    id: "legacy-room",
    name: "기존 방",
    polygon: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    wallIds: Object.values(LEGACY_WALL_IDS),
    usage: "other",
    floorColor,
    source: { ...MIGRATED_SOURCE },
  };
}

function migrateDoor(door: Door): Opening {
  return {
    id: door.id,
    kind: "door",
    wallId: LEGACY_WALL_IDS[door.wall],
    offset: door.offset,
    width: door.width,
    height: door.height,
    sillHeight: 0,
    doorType: door.doorType,
    hinge: door.hinge,
    swing: door.swing,
    slideDirection: door.slideDirection,
    openAngle: door.openAngle,
    thickness: door.thickness,
    color: door.color,
    source: { ...MIGRATED_SOURCE },
  };
}

function migrateWindow(window: Window): Opening {
  return {
    id: window.id,
    kind: "window",
    wallId: LEGACY_WALL_IDS[window.wall],
    offset: window.offset,
    width: window.width,
    height: window.height,
    sillHeight: window.sillHeight,
    source: { ...MIGRATED_SOURCE },
  };
}

export function migrateLegacyLayoutToStructure(layout: LayoutDoc): FloorStructure {
  return {
    id: "legacy-floor",
    name: "1층",
    elevation: 0,
    ceilingHeight: layout.room.ceilingHeight,
    walls: createLegacyWalls(layout),
    rooms: [createLegacyRoom(layout)],
    openings: [...layout.doors.map(migrateDoor), ...layout.windows.map(migrateWindow)],
  };
}

export function migrateLegacyLayoutToProject(
  layout: LayoutDoc,
  projectName = "가져온 레이아웃",
  projectId = "project-migrated"
): InteriorProject {
  const revisionId = "revision-migrated";
  const scenarioId = "scenario-migrated";
  const createdAt = normalizeTimestamp(layout.meta.createdAt);
  const updatedAt = normalizeTimestamp(layout.meta.updatedAt);
  return {
    version: "2.0.0",
    id: projectId,
    name: projectName.trim() || "가져온 레이아웃",
    sources: [],
    assets: [],
    structureRevisions: [
      {
        id: revisionId,
        name: "기존 레이아웃 변환본",
        origin: "migrated",
        structure: migrateLegacyLayoutToStructure(layout),
        createdAt,
      },
    ],
    activeStructureRevisionId: revisionId,
    scenarios: [
      {
        id: scenarioId,
        name: "기존 배치",
        structureRevisionId: revisionId,
        furniture: layout.furniture.map((item) => ({ ...item })),
        materials: [],
        createdAt,
        updatedAt,
      },
    ],
    activeScenarioId: scenarioId,
    memoryPins: [],
    savedViewpoints: [],
    meta: {
      createdAt,
      updatedAt,
    },
  };
}

function normalizeTimestamp(value: string): string {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? new Date(0).toISOString() : timestamp.toISOString();
}
