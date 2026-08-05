import type { StateCreator } from "zustand";
import type { DimensionPlacement, Room, SelectedEntity, ViewMode } from "../../types";
import type { SimulatorState } from "../useSimulatorStore";
import { DEFAULT_ROOM } from "../../constants";

export type RoomSliceState = {
  room: Room;
  viewMode: ViewMode;
  roomDimensionPlacement: DimensionPlacement;
  selectedEntity: SelectedEntity;
  validationErrors: string[];
  setRoom: (patch: Partial<Room>) => void;
  setViewMode: (mode: ViewMode) => void;
  setRoomDimensionPlacement: (patch: Partial<DimensionPlacement>) => void;
  flipRoomDimensionHorizontal: () => void;
  flipRoomDimensionVertical: () => void;
  selectEntity: (entity: SelectedEntity) => void;
  clearSelection: () => void;
};

export const createRoomSlice: StateCreator<
  SimulatorState,
  [],
  [],
  RoomSliceState
> = (set) => ({
  room: { ...DEFAULT_ROOM },
  viewMode: "2d",
  roomDimensionPlacement: { horizontalSide: "top", verticalSide: "right" },
  selectedEntity: null,
  validationErrors: [],

  setRoom: (patch) => set((state) => ({ room: { ...state.room, ...patch } })),

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
});
