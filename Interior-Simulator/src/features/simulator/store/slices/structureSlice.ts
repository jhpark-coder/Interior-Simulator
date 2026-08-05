import type { StateCreator } from "zustand";
import {
  detectRoomRegions,
  moveConnectedWallEndpoint,
  pointInPolygon,
  polygonCentroid,
  splitWallAtPoint,
  validateStructure,
  wallLength,
} from "../../domain/structure";
import type {
  FloorStructure,
  Opening,
  RoomRegion,
  StructureIssue,
  Vec2,
  Wall,
  WallEndpoint,
} from "../../domain/structure";
import { createRectangleStructure } from "../../domain/structure/fixtures";
import { DEFAULT_ROOM } from "../../constants";
import { createId } from "../createId";
import type { SimulatorState } from "../useSimulatorStore";

export type SelectedStructureEntity =
  | { kind: "wall" | "structure-room" | "structure-opening"; id: string }
  | null;

export type StructureSliceState = {
  structure: FloorStructure;
  structurePast: FloorStructure[];
  structureFuture: FloorStructure[];
  structureIssues: StructureIssue[];
  selectedStructureEntity: SelectedStructureEntity;
  setStructure: (structure: FloorStructure, recordHistory?: boolean) => void;
  clearStructure: () => void;
  addWall: (start: Vec2, end: Vec2, patch?: Partial<Wall>) => string | null;
  updateWall: (id: string, patch: Partial<Omit<Wall, "id">>) => void;
  moveWallEndpoint: (
    id: string,
    endpoint: WallEndpoint,
    position: Vec2
  ) => void;
  splitWall: (id: string, point: Vec2) => boolean;
  removeWall: (id: string) => void;
  rebuildRooms: () => void;
  updateStructureRoom: (
    id: string,
    patch: Partial<Omit<RoomRegion, "id">>
  ) => void;
  addStructureOpening: (
    opening: Omit<Opening, "id" | "source"> &
      Partial<Pick<Opening, "id" | "source">>
  ) => string | null;
  updateStructureOpening: (
    id: string,
    patch: Partial<Omit<Opening, "id">>
  ) => void;
  removeStructureOpening: (id: string) => void;
  selectStructureEntity: (entity: SelectedStructureEntity) => void;
  undoStructure: () => void;
  redoStructure: () => void;
};

const STRUCTURE_HISTORY_LIMIT = 50;

function cloneStructure(structure: FloorStructure): FloorStructure {
  return structuredClone(structure);
}

function pushPast(state: StructureSliceState): FloorStructure[] {
  const next = [...state.structurePast, cloneStructure(state.structure)];
  return next.slice(-STRUCTURE_HISTORY_LIMIT);
}

function preserveRoomMetadata(
  previousRooms: RoomRegion[],
  detectedRooms: RoomRegion[]
): RoomRegion[] {
  return detectedRooms.map((detected, index) => {
    const center = polygonCentroid(detected.polygon);
    const previous =
      previousRooms.find((room) => pointInPolygon(center, room.polygon)) ??
      previousRooms[index];
    if (!previous) return detected;
    return {
      ...detected,
      id: previous.id,
      name: previous.name,
      usage: previous.usage,
      floorColor: previous.floorColor,
      source: previous.source,
    };
  });
}

function withRebuiltRooms(structure: FloorStructure): FloorStructure {
  const detected = detectRoomRegions(structure.walls, {
    idFactory: () => createId(),
  });
  return {
    ...structure,
    rooms: preserveRoomMetadata(structure.rooms, detected),
  };
}

function issueState(structure: FloorStructure) {
  return { structureIssues: validateStructure(structure) };
}

const initialStructure = createRectangleStructure({
  width: DEFAULT_ROOM.width,
  height: DEFAULT_ROOM.height,
  wallThickness: DEFAULT_ROOM.wallThickness,
  ceilingHeight: DEFAULT_ROOM.ceilingHeight,
  wallColor: DEFAULT_ROOM.wallColor,
  floorColor: DEFAULT_ROOM.floorColor,
});

export const createStructureSlice: StateCreator<
  SimulatorState,
  [],
  [],
  StructureSliceState
> = (set, get) => ({
  structure: initialStructure,
  structurePast: [],
  structureFuture: [],
  structureIssues: validateStructure(initialStructure),
  selectedStructureEntity: null,

  setStructure: (structure, recordHistory = true) =>
    set((state) => ({
      structure: cloneStructure(structure),
      structurePast: recordHistory ? pushPast(state) : state.structurePast,
      structureFuture: recordHistory ? [] : state.structureFuture,
      selectedStructureEntity: null,
      ...issueState(structure),
    })),

  clearStructure: () => {
    const state = get();
    const structure: FloorStructure = {
      ...state.structure,
      walls: [],
      rooms: [],
      openings: [],
    };
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      selectedStructureEntity: null,
      ...issueState(structure),
    });
  },

  addWall: (start, end, patch) => {
    if (Math.hypot(end.x - start.x, end.y - start.y) < 50) {
      return null;
    }
    const id = patch?.id ?? createId();
    const state = get();
    const wall: Wall = {
      id,
      start: { ...start },
      end: { ...end },
      thickness: patch?.thickness ?? 120,
      height: patch?.height ?? state.structure.ceilingHeight,
      kind: patch?.kind ?? "interior",
      color: patch?.color,
      source: patch?.source ?? {
        origin: "manual",
        confirmedByUser: true,
      },
    };
    const structure = withRebuiltRooms({
      ...state.structure,
      walls: [...state.structure.walls, wall],
    });
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      selectedStructureEntity: { kind: "wall", id },
      ...issueState(structure),
    });
    return id;
  },

  updateWall: (id, patch) => {
    const state = get();
    if (!state.structure.walls.some((wall) => wall.id === id)) return;
    const structure = withRebuiltRooms({
      ...state.structure,
      walls: state.structure.walls.map((wall) =>
        wall.id === id
          ? {
              ...wall,
              ...patch,
              id,
              source: patch.source ?? {
                origin: "manual",
                confirmedByUser: true,
              },
            }
          : wall
      ),
    });
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      ...issueState(structure),
    });
  },

  moveWallEndpoint: (id, endpoint, position) => {
    const state = get();
    const walls = moveConnectedWallEndpoint(
      state.structure.walls,
      id,
      endpoint,
      position
    );
    if (walls === state.structure.walls) return;
    const structure = withRebuiltRooms({ ...state.structure, walls });
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      ...issueState(structure),
    });
  },

  splitWall: (id, point) => {
    const state = get();
    const wall = state.structure.walls.find((candidate) => candidate.id === id);
    if (!wall) return false;
    const split = splitWallAtPoint(wall, point, createId);
    if (!split) return false;
    const firstLength = wallLength(split[0]);
    const crossesOpening = state.structure.openings.some(
      (opening) =>
        opening.wallId === id &&
        opening.offset < firstLength &&
        opening.offset + opening.width > firstLength
    );
    if (crossesOpening) return false;
    const openings = state.structure.openings.map((opening) => {
      if (opening.wallId !== id) return opening;
      if (opening.offset < firstLength) {
        return { ...opening, wallId: split[0].id };
      }
      return {
        ...opening,
        wallId: split[1].id,
        offset: opening.offset - firstLength,
      };
    });
    const wallIndex = state.structure.walls.findIndex(
      (candidate) => candidate.id === id
    );
    const walls = [...state.structure.walls];
    walls.splice(wallIndex, 1, ...split);
    const structure = withRebuiltRooms({
      ...state.structure,
      walls,
      openings,
    });
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      selectedStructureEntity: { kind: "wall", id: split[0].id },
      ...issueState(structure),
    });
    return true;
  },

  removeWall: (id) => {
    const state = get();
    if (!state.structure.walls.some((wall) => wall.id === id)) return;
    const structure = withRebuiltRooms({
      ...state.structure,
      walls: state.structure.walls.filter((wall) => wall.id !== id),
      openings: state.structure.openings.filter(
        (opening) => opening.wallId !== id
      ),
    });
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      selectedStructureEntity: null,
      ...issueState(structure),
    });
  },

  rebuildRooms: () => {
    const state = get();
    const structure = withRebuiltRooms(state.structure);
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      ...issueState(structure),
    });
  },

  updateStructureRoom: (id, patch) => {
    const state = get();
    if (!state.structure.rooms.some((room) => room.id === id)) return;
    const structure = {
      ...state.structure,
      rooms: state.structure.rooms.map((room) =>
        room.id === id ? { ...room, ...patch, id } : room
      ),
    };
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      ...issueState(structure),
    });
  },

  addStructureOpening: (opening) => {
    const state = get();
    const wall = state.structure.walls.find(
      (candidate) => candidate.id === opening.wallId
    );
    if (!wall || opening.offset < 0 || opening.offset + opening.width > wallLength(wall)) {
      return null;
    }
    const id = opening.id ?? createId();
    const nextOpening: Opening = {
      ...opening,
      id,
      source: opening.source ?? {
        origin: "manual",
        confirmedByUser: true,
      },
    };
    const structure = {
      ...state.structure,
      openings: [...state.structure.openings, nextOpening],
    };
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      selectedStructureEntity: { kind: "structure-opening", id },
      ...issueState(structure),
    });
    return id;
  },

  updateStructureOpening: (id, patch) => {
    const state = get();
    if (!state.structure.openings.some((opening) => opening.id === id)) return;
    const structure = {
      ...state.structure,
      openings: state.structure.openings.map((opening) =>
        opening.id === id
          ? {
              ...opening,
              ...patch,
              id,
              source: patch.source ?? {
                origin: "manual",
                confirmedByUser: true,
              },
            }
          : opening
      ),
    };
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      ...issueState(structure),
    });
  },

  removeStructureOpening: (id) => {
    const state = get();
    if (!state.structure.openings.some((opening) => opening.id === id)) return;
    const structure = {
      ...state.structure,
      openings: state.structure.openings.filter(
        (opening) => opening.id !== id
      ),
    };
    set({
      structure,
      structurePast: pushPast(state),
      structureFuture: [],
      selectedStructureEntity: null,
      ...issueState(structure),
    });
  },

  selectStructureEntity: (selectedStructureEntity) =>
    set({ selectedStructureEntity }),

  undoStructure: () => {
    const state = get();
    const previous = state.structurePast[state.structurePast.length - 1];
    if (!previous) return;
    const structure = cloneStructure(previous);
    set({
      structure,
      structurePast: state.structurePast.slice(0, -1),
      structureFuture: [
        cloneStructure(state.structure),
        ...state.structureFuture,
      ],
      selectedStructureEntity: null,
      ...issueState(structure),
    });
  },

  redoStructure: () => {
    const state = get();
    const next = state.structureFuture[0];
    if (!next) return;
    const structure = cloneStructure(next);
    set({
      structure,
      structurePast: [
        ...state.structurePast,
        cloneStructure(state.structure),
      ].slice(-STRUCTURE_HISTORY_LIMIT),
      structureFuture: state.structureFuture.slice(1),
      selectedStructureEntity: null,
      ...issueState(structure),
    });
  },
});
