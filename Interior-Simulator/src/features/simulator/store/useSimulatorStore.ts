import { create } from "zustand";
import {
  DEFAULT_ROOM,
  FURNITURE_CATALOG,
  DEFAULT_DOOR,
  DEFAULT_WINDOW,
  DEFAULT_FURNITURE_COLOR,
} from "../constants";
import type {
  DimensionPlacement,
  Door,
  FurnitureItem,
  FurnitureType,
  LayoutDoc,
  Room,
  SelectedEntity,
  ViewMode,
  Window,
  WallSide,
} from "../types";
import { createHistory, pushHistory, undoHistory, redoHistory } from "./history";
import {
  validateDoorPlacement,
  validateWindowPlacement,
  constrainOpeningOffset,
  checkCollisionWithOthers,
  constrainToRoom,
  computeChildWorldPos,
  computeAttachOffset,
  getChildren,
  buildAttachmentExcludeIds,
  isAttachableType,
  isParentType,
  findOverlappingParent,
  snapToParentEdge,
} from "../utils";

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const createFurnitureItem = (
  type: FurnitureType,
  room: Room,
  overrides: Partial<FurnitureItem> = {}
): FurnitureItem => {
  const template = FURNITURE_CATALOG[type];
  const baseX = room.width / 2 - template.width / 2;
  const baseY = room.height / 2 - template.depth / 2;

  // Determine category based on type
  let category: "furniture" | "appliance" | "electronics" | "fixture" = "furniture";
  if (["refrigerator", "washing-machine", "dryer", "dishwasher", "oven", "microwave"].includes(type)) {
    category = "appliance";
  } else if (["tv", "air-conditioner", "air-purifier", "humidifier", "monitor-stand", "monitor-arm"].includes(type)) {
    category = "electronics";
  } else if (["sink", "toilet", "bathtub", "shower"].includes(type)) {
    category = "fixture";
  }

  return {
    id: createId(),
    type,
    category,
    name: template.label,
    x: baseX,
    y: baseY,
    width: template.width,
    depth: template.depth,
    height: template.height,
    rotation: 0,
    color: DEFAULT_FURNITURE_COLOR,
    zIndex: 0,
    locked: false,
    ...overrides,
  };
};

const buildLayoutDoc = (
  room: Room,
  furniture: FurnitureItem[],
  doors: Door[],
  windows: Window[]
): LayoutDoc => {
  const now = new Date().toISOString();
  return {
    version: "1.2.0",
    room,
    furniture,
    doors,
    windows,
    meta: {
      createdAt: now,
      updatedAt: now,
    },
  };
};

type PendingFurniture = Omit<FurnitureItem, "id">;
type PendingDoor = Omit<Door, "id">;
type PendingWindow = Omit<Window, "id">;
const FURNITURE_COLLISION_ERROR =
  "이 위치에는 가구를 배치할 수 없습니다. 다른 가구와 겹칩니다.";
type PendingFurniturePreset = Partial<
  Pick<
    PendingFurniture,
    "name" | "category" | "width" | "depth" | "height" | "rotation" | "locked" | "color"
  >
>;

type SimulatorState = {
  room: Room;
  furniture: FurnitureItem[];
  doors: Door[];
  windows: Window[];
  selectedEntity: SelectedEntity;
  viewMode: ViewMode;
  roomDimensionPlacement: DimensionPlacement;
  historyPast: LayoutDoc[];
  historyFuture: LayoutDoc[];
  validationErrors: string[];
  pendingFurniture: PendingFurniture | null;
  pendingDoor: PendingDoor | null;
  pendingWindow: PendingWindow | null;
  placingFurnitureId: string | null;
  placingFurniture: PendingFurniture | null;
  setRoom: (patch: Partial<Room>) => void;
  setViewMode: (mode: ViewMode) => void;
  setRoomDimensionPlacement: (patch: Partial<DimensionPlacement>) => void;
  flipRoomDimensionHorizontal: () => void;
  flipRoomDimensionVertical: () => void;
  selectEntity: (entity: SelectedEntity) => void;
  clearSelection: () => void;
  setPendingFurniture: (type: FurnitureType, preset?: PendingFurniturePreset) => void;
  updatePendingFurniture: (patch: Partial<PendingFurniture>) => void;
  commitPendingFurniture: () => void;
  startPlacementForFurniture: (id: string) => void;
  updatePlacementFurniture: (patch: Partial<PendingFurniture>) => void;
  commitPlacementFurniture: () => void;
  cancelPlacementFurniture: () => void;
  setPendingDoor: (wall: WallSide) => void;
  updatePendingDoor: (patch: Partial<PendingDoor>) => void;
  commitPendingDoor: () => void;
  setPendingWindow: (wall: WallSide) => void;
  updatePendingWindow: (patch: Partial<PendingWindow>) => void;
  commitPendingWindow: () => void;
  cancelPending: () => void;
  addFurniture: (type: FurnitureType, overrides?: Partial<FurnitureItem>) => void;
  updateFurniture: (id: string, patch: Partial<FurnitureItem>) => void;
  removeFurniture: (id: string) => void;
  addDoor: (wall: WallSide, offset?: number) => void;
  updateDoor: (id: string, patch: Partial<Omit<Door, "id">>) => void;
  removeDoor: (id: string) => void;
  addWindow: (wall: WallSide, offset?: number) => void;
  updateWindow: (id: string, patch: Partial<Omit<Window, "id">>) => void;
  removeWindow: (id: string) => void;
  attachToParent: (childId: string, parentId: string) => void;
  detachFromParent: (childId: string) => void;
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  importLayout: (layout: LayoutDoc) => void;
  exportLayout: () => LayoutDoc;
  snapshot: () => LayoutDoc;
};

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  room: { ...DEFAULT_ROOM },
  furniture: [],
  doors: [],
  windows: [],
  selectedEntity: null,
  viewMode: "2d",
  roomDimensionPlacement: { horizontalSide: "top", verticalSide: "right" },
  historyPast: [],
  historyFuture: [],
  validationErrors: [],
  pendingFurniture: null,
  pendingDoor: null,
  pendingWindow: null,
  placingFurnitureId: null,
  placingFurniture: null,
  setRoom: (patch) =>
    set((state) => ({
      room: { ...state.room, ...patch },
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setRoomDimensionPlacement: (patch) =>
    set((state) => ({
      roomDimensionPlacement: { ...state.roomDimensionPlacement, ...patch },
    })),
  flipRoomDimensionHorizontal: () =>
    set((state) => ({
      roomDimensionPlacement: {
        ...state.roomDimensionPlacement,
        horizontalSide:
          state.roomDimensionPlacement.horizontalSide === "top" ? "bottom" : "top",
      },
    })),
  flipRoomDimensionVertical: () =>
    set((state) => ({
      roomDimensionPlacement: {
        ...state.roomDimensionPlacement,
        verticalSide:
          state.roomDimensionPlacement.verticalSide === "left" ? "right" : "left",
      },
    })),
  selectEntity: (entity) => set({ selectedEntity: entity }),
  clearSelection: () => set({ selectedEntity: null }),

  // Pending furniture
  setPendingFurniture: (type, preset) => {
    const { room } = get();
    const template = FURNITURE_CATALOG[type];
    const width = preset?.width ?? template.width;
    const depth = preset?.depth ?? template.depth;
    const height = preset?.height ?? template.height;
    const baseX = room.width / 2 - width / 2;
    const baseY = room.height / 2 - depth / 2;

    // Determine category: use preset.category if provided, otherwise infer from type
    let category: "furniture" | "appliance" | "electronics" | "fixture" = "furniture";
    if (preset?.category) {
      category = preset.category;
    } else if (["refrigerator", "washing-machine", "dryer", "dishwasher", "oven", "microwave"].includes(type)) {
      category = "appliance";
    } else if (["tv", "air-conditioner", "air-purifier", "humidifier", "monitor-stand", "monitor-arm"].includes(type)) {
      category = "electronics";
    } else if (["sink", "toilet", "bathtub", "shower"].includes(type)) {
      category = "fixture";
    }

    set({
      pendingFurniture: {
        type,
        category,
        name: preset?.name ?? template.label,
        x: baseX,
        y: baseY,
        width,
        depth,
        height,
        rotation: preset?.rotation ?? 0,
        color: preset?.color ?? DEFAULT_FURNITURE_COLOR,
        zIndex: 0,
        locked: preset?.locked ?? false,
      },
      pendingDoor: null,
      pendingWindow: null,
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity: null,
    });
  },
  updatePendingFurniture: (patch) =>
    set((state) => ({
      pendingFurniture: state.pendingFurniture
        ? { ...state.pendingFurniture, ...patch }
        : null,
    })),
  commitPendingFurniture: () => {
    const { pendingFurniture, furniture } = get();
    if (!pendingFurniture) return;

    const item: FurnitureItem = {
      ...pendingFurniture,
      id: createId(),
    };

    // Auto-attach: if this is an attachable type and overlaps a desk/table
    if (isAttachableType(item.type)) {
      const parent = findOverlappingParent(item, furniture);
      if (parent) {
        // Snap to nearest edge of the parent
        const childCx = item.x + item.width / 2;
        const childCy = item.y + item.depth / 2;
        const snapped = snapToParentEdge(item, parent, childCx, childCy);
        item.x = snapped.x;
        item.y = snapped.y;
        item.parentId = parent.id;
        const offset = computeAttachOffset(item, parent);
        item.attachOffsetX = offset.attachOffsetX;
        item.attachOffsetY = offset.attachOffsetY;
      }
    }

    // Build collision exclude set (parent/siblings are excluded)
    const excludeIds = new Set<string>();
    if (item.parentId) {
      excludeIds.add(item.parentId);
      for (const f of furniture) {
        if (f.parentId === item.parentId) excludeIds.add(f.id);
      }
    }

    // Check collision with existing furniture (excluding parent/siblings)
    if (checkCollisionWithOthers(item, furniture, excludeIds)) {
      set({
        validationErrors: [FURNITURE_COLLISION_ERROR],
      });
      return;
    }

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      furniture: [...furniture, item],
      pendingFurniture: null,
      selectedEntity: { kind: "furniture", id: item.id },
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
      validationErrors: [],
    });
  },
  startPlacementForFurniture: (id) => {
    const { furniture } = get();
    const target = furniture.find((item) => item.id === id);
    if (!target) return;
    const { id: _targetId, ...draft } = target;

    set({
      pendingFurniture: null,
      pendingDoor: null,
      pendingWindow: null,
      placingFurnitureId: id,
      placingFurniture: draft,
      selectedEntity: { kind: "furniture", id },
      validationErrors: [],
    });
  },
  updatePlacementFurniture: (patch) =>
    set((state) => ({
      placingFurniture: state.placingFurniture
        ? { ...state.placingFurniture, ...patch }
        : null,
    })),
  commitPlacementFurniture: () => {
    const { placingFurnitureId, placingFurniture, furniture, room } = get();
    if (!placingFurnitureId || !placingFurniture) return;

    const item: FurnitureItem = {
      ...placingFurniture,
      id: placingFurnitureId,
    };
    const constrained = constrainToRoom(item, room);
    item.x = constrained.x;
    item.y = constrained.y;

    // Auto-attach: if attachable type placed on desk/table
    if (isAttachableType(item.type) && !item.parentId) {
      const otherFurniture = furniture.filter((f) => f.id !== placingFurnitureId);
      const parent = findOverlappingParent(item, otherFurniture);
      if (parent) {
        const childCx = item.x + item.width / 2;
        const childCy = item.y + item.depth / 2;
        const snapped = snapToParentEdge(item, parent, childCx, childCy);
        item.x = snapped.x;
        item.y = snapped.y;
        item.parentId = parent.id;
        const offset = computeAttachOffset(item, parent);
        item.attachOffsetX = offset.attachOffsetX;
        item.attachOffsetY = offset.attachOffsetY;
      }
    }

    // Build exclude set for parent-child collision
    const excludeIds = buildAttachmentExcludeIds(placingFurnitureId, furniture);
    // Also exclude the parent if we just auto-attached
    if (item.parentId) {
      excludeIds.add(item.parentId);
      for (const f of furniture) {
        if (f.parentId === item.parentId) excludeIds.add(f.id);
      }
    }

    if (checkCollisionWithOthers(item, furniture, excludeIds)) {
      set({ validationErrors: [FURNITURE_COLLISION_ERROR] });
      return;
    }

    // Recalculate attachment offset if this is a child
    if (item.parentId) {
      const parent = furniture.find((f) => f.id === item.parentId);
      if (parent) {
        const offset = computeAttachOffset(item, parent);
        item.attachOffsetX = offset.attachOffsetX;
        item.attachOffsetY = offset.attachOffsetY;
      }
    }

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    // If this item is a parent, sync children positions
    let updatedFurniture = furniture.map((existing) =>
      existing.id === placingFurnitureId ? item : existing
    );

    if (!item.parentId) {
      const children = getChildren(placingFurnitureId, updatedFurniture);
      if (children.length > 0) {
        updatedFurniture = updatedFurniture.map((f) => {
          if (f.parentId !== placingFurnitureId) return f;
          const worldPos = computeChildWorldPos(
            f.attachOffsetX ?? 0,
            f.attachOffsetY ?? 0,
            item,
          );
          return {
            ...f,
            x: worldPos.x - f.width / 2,
            y: worldPos.y - f.depth / 2,
          };
        });
      }
    }

    set({
      furniture: updatedFurniture,
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity: { kind: "furniture", id: placingFurnitureId },
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
      validationErrors: [],
    });
  },
  cancelPlacementFurniture: () => {
    const { placingFurnitureId } = get();
    set((state) => ({
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity:
        placingFurnitureId ? { kind: "furniture", id: placingFurnitureId } : state.selectedEntity,
      validationErrors: [],
    }));
  },

  // Pending door
  setPendingDoor: (wall) => {
    set({
      pendingDoor: {
        wall,
        offset: 0,
        ...DEFAULT_DOOR,
      },
      pendingFurniture: null,
      pendingWindow: null,
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity: null,
    });
  },
  updatePendingDoor: (patch) =>
    set((state) => ({
      pendingDoor: state.pendingDoor ? { ...state.pendingDoor, ...patch } : null,
    })),
  commitPendingDoor: () => {
    const { pendingDoor, room, doors, windows } = get();
    if (!pendingDoor) return;

    const newDoor: Door = {
      ...pendingDoor,
      id: createId(),
    };

    // Constrain to wall
    newDoor.offset = constrainOpeningOffset(
      newDoor.wall,
      newDoor.offset,
      newDoor.width,
      room
    );

    // Validate placement
    const validation = validateDoorPlacement(newDoor, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "유효하지 않은 문 배치"] });
      return;
    }

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      doors: [...doors, newDoor],
      pendingDoor: null,
      selectedEntity: { kind: "door", id: newDoor.id },
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
      validationErrors: [],
    });
  },

  // Pending window
  setPendingWindow: (wall) => {
    set({
      pendingWindow: {
        wall,
        offset: 0,
        ...DEFAULT_WINDOW,
      },
      pendingFurniture: null,
      pendingDoor: null,
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity: null,
    });
  },
  updatePendingWindow: (patch) =>
    set((state) => ({
      pendingWindow: state.pendingWindow
        ? { ...state.pendingWindow, ...patch }
        : null,
    })),
  commitPendingWindow: () => {
    const { pendingWindow, room, doors, windows } = get();
    if (!pendingWindow) return;

    const newWindow: Window = {
      ...pendingWindow,
      id: createId(),
    };

    // Constrain to wall
    newWindow.offset = constrainOpeningOffset(
      newWindow.wall,
      newWindow.offset,
      newWindow.width,
      room
    );

    // Validate placement
    const validation = validateWindowPlacement(newWindow, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "유효하지 않은 창문 배치"] });
      return;
    }

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      windows: [...windows, newWindow],
      pendingWindow: null,
      selectedEntity: { kind: "window", id: newWindow.id },
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
      validationErrors: [],
    });
  },

  cancelPending: () =>
    set({
      pendingFurniture: null,
      pendingDoor: null,
      pendingWindow: null,
      placingFurnitureId: null,
      placingFurniture: null,
    }),
  addFurniture: (type, overrides) =>
    set((state) => {
      const item = createFurnitureItem(type, state.room, overrides);
      const snapshot = get().snapshot();
      const history = createHistory<LayoutDoc>(30);
      const newHistory = pushHistory(history, snapshot);
      return {
        furniture: [...state.furniture, item],
        selectedEntity: { kind: "furniture", id: item.id },
        historyPast: newHistory.past,
        historyFuture: newHistory.future,
      };
    }),
  updateFurniture: (id, patch) => {
    const { furniture, room } = get();
    const needsPlacementValidation =
      patch.x !== undefined ||
      patch.y !== undefined ||
      patch.rotation !== undefined ||
      patch.width !== undefined ||
      patch.depth !== undefined;

    let collisionRejected = false;
    const target = furniture.find((f) => f.id === id);
    if (!target) return;

    // Build exclude set for parent-child collision
    const excludeIds = buildAttachmentExcludeIds(id, furniture);

    let updatedFurniture = furniture.map((item) => {
      if (item.id !== id) return item;
      const candidate: FurnitureItem = { ...item, ...patch };

      if (!needsPlacementValidation) {
        return candidate;
      }

      const constrained = constrainToRoom(candidate, room);
      candidate.x = constrained.x;
      candidate.y = constrained.y;

      if (checkCollisionWithOthers(candidate, furniture, excludeIds)) {
        collisionRejected = true;
        return item;
      }

      return candidate;
    });

    if (!collisionRejected && needsPlacementValidation) {
      const updated = updatedFurniture.find((f) => f.id === id)!;

      if (!updated.parentId) {
        // This item might be a parent — sync children
        const children = getChildren(id, updatedFurniture);
        if (children.length > 0) {
          updatedFurniture = updatedFurniture.map((f) => {
            if (f.parentId !== id) return f;
            const worldPos = computeChildWorldPos(
              f.attachOffsetX ?? 0,
              f.attachOffsetY ?? 0,
              updated,
            );
            return {
              ...f,
              x: worldPos.x - f.width / 2,
              y: worldPos.y - f.depth / 2,
            };
          });
        }
      } else {
        // This item is a child — recalculate offset from parent
        const parent = updatedFurniture.find((f) => f.id === updated.parentId);
        if (parent) {
          const offset = computeAttachOffset(updated, parent);
          updatedFurniture = updatedFurniture.map((f) =>
            f.id === id ? { ...f, ...offset } : f,
          );
        }
      }
    }

    set({
      furniture: updatedFurniture,
      validationErrors: collisionRejected ? [FURNITURE_COLLISION_ERROR] : [],
    });
  },
  removeFurniture: (id) => {
    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    // Collect IDs to remove: self + all children (cascade)
    const { furniture } = get();
    const childIds = new Set(
      furniture.filter((f) => f.parentId === id).map((f) => f.id),
    );
    const removeIds = new Set([id, ...childIds]);

    set((state) => ({
      furniture: state.furniture.filter((item) => !removeIds.has(item.id)),
      selectedEntity:
        state.selectedEntity?.kind === "furniture" &&
        removeIds.has(state.selectedEntity.id)
          ? null
          : state.selectedEntity,
      placingFurnitureId: state.placingFurnitureId === id ? null : state.placingFurnitureId,
      placingFurniture: state.placingFurnitureId === id ? null : state.placingFurniture,
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
    }));
  },
  addDoor: (wall, offset) => {
    const { room, doors, windows } = get();
    const newDoor: Door = {
      id: createId(),
      wall,
      offset: offset ?? 0,
      ...DEFAULT_DOOR,
    };

    // Constrain to wall
    newDoor.offset = constrainOpeningOffset(
      wall,
      newDoor.offset,
      newDoor.width,
      room
    );

    // Validate placement
    const validation = validateDoorPlacement(newDoor, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "Invalid door placement"] });
      return;
    }

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      doors: [...doors, newDoor],
      selectedEntity: { kind: "door", id: newDoor.id },
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
      validationErrors: [],
    });
  },
  updateDoor: (id, patch) => {
    const { room, doors, windows } = get();
    const updatedDoors = doors.map((door) => {
      if (door.id !== id) return door;
      const updated = { ...door, ...patch };

      // Constrain offset if changed
      if (patch.offset !== undefined || patch.width !== undefined) {
        updated.offset = constrainOpeningOffset(
          updated.wall,
          updated.offset,
          updated.width,
          room
        );
      }

      return updated;
    });

    // Validate updated door
    const updatedDoor = updatedDoors.find((d) => d.id === id);
    if (updatedDoor) {
      const validation = validateDoorPlacement(
        updatedDoor,
        updatedDoors,
        windows,
        room
      );
      if (!validation.valid) {
        set({ validationErrors: [validation.error || "Invalid door placement"] });
        return;
      }
    }

    set({
      doors: updatedDoors,
      validationErrors: [],
    });
  },
  removeDoor: (id) => {
    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set((state) => ({
      doors: state.doors.filter((door) => door.id !== id),
      selectedEntity:
        state.selectedEntity?.kind === "door" && state.selectedEntity.id === id
          ? null
          : state.selectedEntity,
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
    }));
  },
  addWindow: (wall, offset) => {
    const { room, doors, windows } = get();
    const newWindow: Window = {
      id: createId(),
      wall,
      offset: offset ?? 0,
      ...DEFAULT_WINDOW,
    };

    // Constrain to wall
    newWindow.offset = constrainOpeningOffset(
      wall,
      newWindow.offset,
      newWindow.width,
      room
    );

    // Validate placement
    const validation = validateWindowPlacement(newWindow, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "Invalid window placement"] });
      return;
    }

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      windows: [...windows, newWindow],
      selectedEntity: { kind: "window", id: newWindow.id },
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
      validationErrors: [],
    });
  },
  updateWindow: (id, patch) => {
    const { room, doors, windows } = get();
    const updatedWindows = windows.map((window) => {
      if (window.id !== id) return window;
      const updated = { ...window, ...patch };

      // Constrain offset if changed
      if (patch.offset !== undefined || patch.width !== undefined) {
        updated.offset = constrainOpeningOffset(
          updated.wall,
          updated.offset,
          updated.width,
          room
        );
      }

      return updated;
    });

    // Validate updated window
    const updatedWindow = updatedWindows.find((w) => w.id === id);
    if (updatedWindow) {
      const validation = validateWindowPlacement(
        updatedWindow,
        doors,
        updatedWindows,
        room
      );
      if (!validation.valid) {
        set({ validationErrors: [validation.error || "Invalid window placement"] });
        return;
      }
    }

    set({
      windows: updatedWindows,
      validationErrors: [],
    });
  },
  removeWindow: (id) => {
    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set((state) => ({
      windows: state.windows.filter((window) => window.id !== id),
      selectedEntity:
        state.selectedEntity?.kind === "window" &&
        state.selectedEntity.id === id
          ? null
          : state.selectedEntity,
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
    }));
  },
  attachToParent: (childId, parentId) => {
    const { furniture } = get();
    const child = furniture.find((f) => f.id === childId);
    const parent = furniture.find((f) => f.id === parentId);
    if (!child || !parent) return;
    // Prevent circular attachment
    if (parent.parentId) return;
    if (child.parentId) return; // Already attached

    const offset = computeAttachOffset(child, parent);

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      furniture: furniture.map((f) =>
        f.id === childId
          ? { ...f, parentId, attachOffsetX: offset.attachOffsetX, attachOffsetY: offset.attachOffsetY }
          : f,
      ),
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
    });
  },
  detachFromParent: (childId) => {
    const { furniture } = get();
    const child = furniture.find((f) => f.id === childId);
    if (!child || !child.parentId) return;

    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);

    set({
      furniture: furniture.map((f) =>
        f.id === childId
          ? { ...f, parentId: undefined, attachOffsetX: undefined, attachOffsetY: undefined }
          : f,
      ),
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
    });
  },
  commitHistory: () => {
    const snapshot = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const newHistory = pushHistory(history, snapshot);
    set({
      historyPast: newHistory.past,
      historyFuture: newHistory.future,
    });
  },
  undo: () => {
    const current = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const { history: newHistory, snapshot } = undoHistory(history, current);

    if (snapshot) {
      set({
        room: snapshot.room,
        furniture: snapshot.furniture,
        doors: snapshot.doors,
        windows: snapshot.windows,
        pendingFurniture: null,
        pendingDoor: null,
        pendingWindow: null,
        placingFurnitureId: null,
        placingFurniture: null,
        historyPast: newHistory.past,
        historyFuture: newHistory.future,
      });
    }
  },
  redo: () => {
    const current = get().snapshot();
    const history = createHistory<LayoutDoc>(30);
    history.past = get().historyPast;
    history.future = get().historyFuture;
    const { history: newHistory, snapshot } = redoHistory(history, current);

    if (snapshot) {
      set({
        room: snapshot.room,
        furniture: snapshot.furniture,
        doors: snapshot.doors,
        windows: snapshot.windows,
        pendingFurniture: null,
        pendingDoor: null,
        pendingWindow: null,
        placingFurnitureId: null,
        placingFurniture: null,
        historyPast: newHistory.past,
        historyFuture: newHistory.future,
      });
    }
  },
  importLayout: (layout: LayoutDoc) => {
    const allIds = new Set(layout.furniture.map((f) => f.id));
    // Clean up orphan children and recalculate world positions from offsets
    const furniture = layout.furniture.map((f) => {
      if (f.parentId && !allIds.has(f.parentId)) {
        // Orphan: remove attachment fields
        const { parentId: _, attachOffsetX: _ox, attachOffsetY: _oy, ...rest } = f;
        return rest as FurnitureItem;
      }
      if (f.parentId) {
        const parent = layout.furniture.find((p) => p.id === f.parentId);
        if (parent) {
          const worldPos = computeChildWorldPos(
            f.attachOffsetX ?? 0,
            f.attachOffsetY ?? 0,
            parent,
          );
          return {
            ...f,
            x: worldPos.x - f.width / 2,
            y: worldPos.y - f.depth / 2,
          };
        }
      }
      return f;
    });
    set({
      room: layout.room,
      furniture,
      doors: layout.doors,
      windows: layout.windows,
      pendingFurniture: null,
      pendingDoor: null,
      pendingWindow: null,
      placingFurnitureId: null,
      placingFurniture: null,
      historyPast: [],
      historyFuture: [],
    });
  },
  exportLayout: () => {
    return get().snapshot();
  },
  snapshot: () => {
    const { room, furniture, doors, windows } = get();
    return buildLayoutDoc(room, furniture, doors, windows);
  },
}));
