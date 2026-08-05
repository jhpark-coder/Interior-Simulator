import type { StateCreator } from "zustand";
import type { MemoryPin, SavedViewpoint } from "../../domain/memory/types";
import { pointInPolygon, type Vec2 } from "../../domain/structure";
import { createId } from "../createId";
import type { SimulatorState } from "../useSimulatorStore";

export type NavigationMode = "orbit" | "walk";

export type MemorySliceState = {
  memoryPins: MemoryPin[];
  savedViewpoints: SavedViewpoint[];
  selectedMemoryPinId: string | null;
  activeViewpointId: string | null;
  memorySearch: string;
  navigationMode: NavigationMode;
  addMemoryPin: (position: Vec2) => string;
  updateMemoryPin: (
    id: string,
    patch: Partial<Omit<MemoryPin, "id" | "createdAt">>
  ) => void;
  removeMemoryPin: (id: string) => void;
  selectMemoryPin: (id: string | null) => void;
  attachPhotoToMemoryPin: (pinId: string, assetId: string) => void;
  detachPhotoFromMemoryPin: (pinId: string, assetId: string) => void;
  setMemorySearch: (value: string) => void;
  setNavigationMode: (mode: NavigationMode) => void;
  addSavedViewpoint: (
    name: string,
    position: SavedViewpoint["position"],
    target: SavedViewpoint["target"]
  ) => string;
  removeSavedViewpoint: (id: string) => void;
  activateViewpoint: (id: string | null) => void;
};

function now(): string {
  return new Date().toISOString();
}

export const createMemorySlice: StateCreator<
  SimulatorState,
  [],
  [],
  MemorySliceState
> = (set, get) => ({
  memoryPins: [],
  savedViewpoints: [],
  selectedMemoryPinId: null,
  activeViewpointId: null,
  memorySearch: "",
  navigationMode: "orbit",

  addMemoryPin: (position) => {
    const state = get();
    const timestamp = now();
    const roomId = state.structure.rooms.find((room) =>
      pointInPolygon(position, room.polygon)
    )?.id;
    const id = createId();
    const pin: MemoryPin = {
      id,
      roomId,
      position: { ...position },
      cameraDirection: 0,
      title: `공간 기록 ${state.memoryPins.length + 1}`,
      note: "",
      assetIds: [],
      temporalState: "current",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set({
      memoryPins: [...state.memoryPins, pin],
      selectedMemoryPinId: id,
    });
    return id;
  },

  updateMemoryPin: (id, patch) =>
    set((state) => ({
      memoryPins: state.memoryPins.map((pin) =>
        pin.id === id
          ? {
              ...pin,
              ...patch,
              position: patch.position
                ? { ...patch.position }
                : pin.position,
              assetIds: patch.assetIds
                ? [...patch.assetIds]
                : pin.assetIds,
              updatedAt: now(),
            }
          : pin
      ),
    })),

  removeMemoryPin: (id) =>
    set((state) => ({
      memoryPins: state.memoryPins.filter((pin) => pin.id !== id),
      selectedMemoryPinId:
        state.selectedMemoryPinId === id
          ? null
          : state.selectedMemoryPinId,
    })),

  selectMemoryPin: (selectedMemoryPinId) => set({ selectedMemoryPinId }),

  attachPhotoToMemoryPin: (pinId, assetId) =>
    get().updateMemoryPin(pinId, {
      assetIds: [
        ...new Set([
          ...(get().memoryPins.find((pin) => pin.id === pinId)?.assetIds ?? []),
          assetId,
        ]),
      ],
    }),

  detachPhotoFromMemoryPin: (pinId, assetId) => {
    const pin = get().memoryPins.find((item) => item.id === pinId);
    if (!pin) return;
    get().updateMemoryPin(pinId, {
      assetIds: pin.assetIds.filter((id) => id !== assetId),
    });
  },

  setMemorySearch: (memorySearch) => set({ memorySearch }),
  setNavigationMode: (navigationMode) => set({ navigationMode }),

  addSavedViewpoint: (name, position, target) => {
    const id = createId();
    set((state) => ({
      savedViewpoints: [
        ...state.savedViewpoints,
        {
          id,
          name: name.trim() || `시점 ${state.savedViewpoints.length + 1}`,
          position: { ...position },
          target: { ...target },
          createdAt: now(),
        },
      ],
      activeViewpointId: id,
    }));
    return id;
  },

  removeSavedViewpoint: (id) =>
    set((state) => ({
      savedViewpoints: state.savedViewpoints.filter(
        (viewpoint) => viewpoint.id !== id
      ),
      activeViewpointId:
        state.activeViewpointId === id ? null : state.activeViewpointId,
    })),

  activateViewpoint: (activeViewpointId) => set({ activeViewpointId }),
});
