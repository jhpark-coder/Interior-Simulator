import type { StateCreator } from "zustand";
import type { FurnitureItem, FurnitureType, Room } from "../../types";
import type { SimulatorState } from "../useSimulatorStore";
import { FURNITURE_CATALOG, DEFAULT_FURNITURE_COLOR } from "../../constants";
import {
  checkCollisionWithOthers,
  constrainToRoom,
  computeChildWorldPos,
  computeAttachOffset,
  getChildren,
  buildAttachmentExcludeIds,
  isAttachableType,
  findOverlappingParent,
  snapToParentEdge,
  inferCategoryFromType,
  validateFurnitureInStructure,
} from "../../utils";
import { createId } from "../createId";
import { pushSnapshotFromState } from "./historySlice";

type PendingFurniture = Omit<FurnitureItem, "id">;
type PendingFurniturePreset = Partial<
  Pick<PendingFurniture, "name" | "category" | "width" | "depth" | "height" | "rotation" | "locked" | "color">
>;

const FURNITURE_COLLISION_ERROR = "이 위치에는 가구를 배치할 수 없습니다. 다른 가구와 겹칩니다.";

const FURNITURE_OUTSIDE_STRUCTURE_ERROR =
  "가구가 집 구조 바깥에 있습니다. 방 내부로 옮겨 주세요.";
const FURNITURE_CROSSES_WALL_ERROR =
  "가구가 벽을 가로지릅니다. 문이나 열린 통로를 이용해 배치해 주세요.";

function placementError(
  item: FurnitureItem,
  structure: SimulatorState["structure"]
): string | null {
  const result = validateFurnitureInStructure(item, structure);
  if (result.valid) return null;
  return result.reason === "crosses-wall"
    ? FURNITURE_CROSSES_WALL_ERROR
    : FURNITURE_OUTSIDE_STRUCTURE_ERROR;
}

function createFurnitureItem(
  type: FurnitureType,
  room: Room,
  overrides: Partial<FurnitureItem> = {}
): FurnitureItem {
  const template = FURNITURE_CATALOG[type];
  const baseX = room.width / 2 - template.width / 2;
  const baseY = room.height / 2 - template.depth / 2;
  const category = inferCategoryFromType(type);
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
}

export type FurnitureSliceState = {
  furniture: FurnitureItem[];
  pendingFurniture: PendingFurniture | null;
  placingFurnitureId: string | null;
  placingFurniture: PendingFurniture | null;
  setPendingFurniture: (type: FurnitureType, preset?: PendingFurniturePreset) => void;
  updatePendingFurniture: (patch: Partial<PendingFurniture>) => void;
  commitPendingFurniture: () => void;
  startPlacementForFurniture: (id: string) => void;
  updatePlacementFurniture: (patch: Partial<PendingFurniture>) => void;
  commitPlacementFurniture: () => void;
  cancelPlacementFurniture: () => void;
  cancelPending: () => void;
  addFurniture: (type: FurnitureType, overrides?: Partial<FurnitureItem>) => void;
  updateFurniture: (id: string, patch: Partial<FurnitureItem>) => void;
  removeFurniture: (id: string) => void;
  attachToParent: (childId: string, parentId: string) => void;
  detachFromParent: (childId: string) => void;
};

export const createFurnitureSlice: StateCreator<
  SimulatorState,
  [],
  [],
  FurnitureSliceState
> = (set, get) => ({
  furniture: [],
  pendingFurniture: null,
  placingFurnitureId: null,
  placingFurniture: null,

  setPendingFurniture: (type, preset) => {
    const { room } = get();
    const template = FURNITURE_CATALOG[type];
    const width = preset?.width ?? template.width;
    const depth = preset?.depth ?? template.depth;
    const height = preset?.height ?? template.height;
    const baseX = room.width / 2 - width / 2;
    const baseY = room.height / 2 - depth / 2;
    const category = preset?.category ?? inferCategoryFromType(type);

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
    const { pendingFurniture, furniture, structure } = get();
    if (!pendingFurniture) return;

    const item: FurnitureItem = { ...pendingFurniture, id: createId() };

    if (isAttachableType(item.type)) {
      const parent = findOverlappingParent(item, furniture);
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

    const excludeIds = new Set<string>();
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

    const structureError = placementError(item, structure);
    if (structureError) {
      set({ validationErrors: [structureError] });
      return;
    }

    const { past, future } = pushSnapshotFromState(get);
    set({
      furniture: [...furniture, item],
      pendingFurniture: null,
      selectedEntity: { kind: "furniture", id: item.id },
      historyPast: past,
      historyFuture: future,
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
    const { placingFurnitureId, placingFurniture, furniture, room, structure } = get();
    if (!placingFurnitureId || !placingFurniture) return;

    const item: FurnitureItem = { ...placingFurniture, id: placingFurnitureId };
    const constrained = constrainToRoom(item, room);
    item.x = constrained.x;
    item.y = constrained.y;

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

    const excludeIds = buildAttachmentExcludeIds(placingFurnitureId, furniture);
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

    const structureError = placementError(item, structure);
    if (structureError) {
      set({ validationErrors: [structureError] });
      return;
    }

    if (item.parentId) {
      const parent = furniture.find((f) => f.id === item.parentId);
      if (parent) {
        const offset = computeAttachOffset(item, parent);
        item.attachOffsetX = offset.attachOffsetX;
        item.attachOffsetY = offset.attachOffsetY;
      }
    }

    const { past, future } = pushSnapshotFromState(get);

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
            item
          );
          return { ...f, x: worldPos.x - f.width / 2, y: worldPos.y - f.depth / 2 };
        });
      }
    }

    set({
      furniture: updatedFurniture,
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity: { kind: "furniture", id: placingFurnitureId },
      historyPast: past,
      historyFuture: future,
      validationErrors: [],
    });
  },

  cancelPlacementFurniture: () => {
    const { placingFurnitureId } = get();
    set((state) => ({
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity:
        placingFurnitureId
          ? { kind: "furniture", id: placingFurnitureId }
          : state.selectedEntity,
      validationErrors: [],
    }));
  },

  cancelPending: () =>
    set({
      pendingFurniture: null,
      pendingDoor: null,
      pendingWindow: null,
      placingFurnitureId: null,
      placingFurniture: null,
    }),

  addFurniture: (type, overrides) => {
    const item = createFurnitureItem(type, get().room, overrides);
    const { past, future } = pushSnapshotFromState(get);
    set((state) => ({
      furniture: [...state.furniture, item],
      selectedEntity: { kind: "furniture", id: item.id },
      historyPast: past,
      historyFuture: future,
    }));
  },

  updateFurniture: (id, patch) => {
    const { furniture, room, structure } = get();
    const needsPlacementValidation =
      patch.x !== undefined ||
      patch.y !== undefined ||
      patch.rotation !== undefined ||
      patch.width !== undefined ||
      patch.depth !== undefined;

    let placementRejected: string | null = null;
    const target = furniture.find((f) => f.id === id);
    if (!target) return;

    const excludeIds = buildAttachmentExcludeIds(id, furniture);

    let updatedFurniture = furniture.map((item) => {
      if (item.id !== id) return item;
      const candidate: FurnitureItem = { ...item, ...patch };

      if (!needsPlacementValidation) return candidate;

      const constrained = constrainToRoom(candidate, room);
      candidate.x = constrained.x;
      candidate.y = constrained.y;

      if (checkCollisionWithOthers(candidate, furniture, excludeIds)) {
        placementRejected = FURNITURE_COLLISION_ERROR;
        return item;
      }

      const structureError = placementError(candidate, structure);
      if (structureError) {
        placementRejected = structureError;
        return item;
      }

      return candidate;
    });

    if (!placementRejected && needsPlacementValidation) {
      const updated = updatedFurniture.find((f) => f.id === id)!;

      if (!updated.parentId) {
        const children = getChildren(id, updatedFurniture);
        if (children.length > 0) {
          updatedFurniture = updatedFurniture.map((f) => {
            if (f.parentId !== id) return f;
            const worldPos = computeChildWorldPos(
              f.attachOffsetX ?? 0,
              f.attachOffsetY ?? 0,
              updated
            );
            return { ...f, x: worldPos.x - f.width / 2, y: worldPos.y - f.depth / 2 };
          });
        }
      } else {
        const parent = updatedFurniture.find((f) => f.id === updated.parentId);
        if (parent) {
          const offset = computeAttachOffset(updated, parent);
          updatedFurniture = updatedFurniture.map((f) =>
            f.id === id ? { ...f, ...offset } : f
          );
        }
      }
    }

    set({
      furniture: updatedFurniture,
      validationErrors: placementRejected ? [placementRejected] : [],
    });
  },

  removeFurniture: (id) => {
    const { past, future } = pushSnapshotFromState(get);
    const { furniture } = get();
    const childIds = new Set(furniture.filter((f) => f.parentId === id).map((f) => f.id));
    const removeIds = new Set([id, ...childIds]);

    set((state) => ({
      furniture: state.furniture.filter((item) => !removeIds.has(item.id)),
      selectedEntity:
        state.selectedEntity?.kind === "furniture" && removeIds.has(state.selectedEntity.id)
          ? null
          : state.selectedEntity,
      placingFurnitureId: state.placingFurnitureId === id ? null : state.placingFurnitureId,
      placingFurniture: state.placingFurnitureId === id ? null : state.placingFurniture,
      historyPast: past,
      historyFuture: future,
    }));
  },

  attachToParent: (childId, parentId) => {
    const { furniture } = get();
    const child = furniture.find((f) => f.id === childId);
    const parent = furniture.find((f) => f.id === parentId);
    if (!child || !parent) return;
    if (parent.parentId) return;
    if (child.parentId) return;

    const offset = computeAttachOffset(child, parent);
    const { past, future } = pushSnapshotFromState(get);

    set({
      furniture: furniture.map((f) =>
        f.id === childId
          ? { ...f, parentId, attachOffsetX: offset.attachOffsetX, attachOffsetY: offset.attachOffsetY }
          : f
      ),
      historyPast: past,
      historyFuture: future,
    });
  },

  detachFromParent: (childId) => {
    const { furniture } = get();
    const child = furniture.find((f) => f.id === childId);
    if (!child || !child.parentId) return;

    const { past, future } = pushSnapshotFromState(get);

    set({
      furniture: furniture.map((f) =>
        f.id === childId
          ? { ...f, parentId: undefined, attachOffsetX: undefined, attachOffsetY: undefined }
          : f
      ),
      historyPast: past,
      historyFuture: future,
    });
  },
});
