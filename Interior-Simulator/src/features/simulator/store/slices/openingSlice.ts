import type { StateCreator } from "zustand";
import type { Door, Window, WallSide } from "../../types";
import type { SimulatorState } from "../useSimulatorStore";
import { DEFAULT_DOOR, DEFAULT_WINDOW } from "../../constants";
import {
  validateDoorPlacement,
  validateWindowPlacement,
  constrainOpeningOffset,
} from "../../utils";
import { createId } from "../createId";
import { pushSnapshotFromState } from "./historySlice";

type PendingDoor = Omit<Door, "id">;
type PendingWindow = Omit<Window, "id">;

export type OpeningSliceState = {
  doors: Door[];
  windows: Window[];
  pendingDoor: PendingDoor | null;
  pendingWindow: PendingWindow | null;
  setPendingDoor: (wall: WallSide) => void;
  updatePendingDoor: (patch: Partial<PendingDoor>) => void;
  commitPendingDoor: () => void;
  setPendingWindow: (wall: WallSide) => void;
  updatePendingWindow: (patch: Partial<PendingWindow>) => void;
  commitPendingWindow: () => void;
  addDoor: (wall: WallSide, offset?: number) => void;
  updateDoor: (id: string, patch: Partial<Omit<Door, "id">>) => void;
  removeDoor: (id: string) => void;
  addWindow: (wall: WallSide, offset?: number) => void;
  updateWindow: (id: string, patch: Partial<Omit<Window, "id">>) => void;
  removeWindow: (id: string) => void;
};

export const createOpeningSlice: StateCreator<
  SimulatorState,
  [],
  [],
  OpeningSliceState
> = (set, get) => ({
  doors: [],
  windows: [],
  pendingDoor: null,
  pendingWindow: null,

  setPendingDoor: (wall) => {
    set({
      pendingDoor: { wall, offset: 0, ...DEFAULT_DOOR },
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

    const newDoor: Door = { ...pendingDoor, id: createId() };
    newDoor.offset = constrainOpeningOffset(newDoor.wall, newDoor.offset, newDoor.width, room);

    const validation = validateDoorPlacement(newDoor, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "유효하지 않은 문 배치"] });
      return;
    }

    const { past, future } = pushSnapshotFromState(get);
    set({
      doors: [...doors, newDoor],
      pendingDoor: null,
      selectedEntity: { kind: "door", id: newDoor.id },
      historyPast: past,
      historyFuture: future,
      validationErrors: [],
    });
  },

  setPendingWindow: (wall) => {
    set({
      pendingWindow: { wall, offset: 0, ...DEFAULT_WINDOW },
      pendingFurniture: null,
      pendingDoor: null,
      placingFurnitureId: null,
      placingFurniture: null,
      selectedEntity: null,
    });
  },

  updatePendingWindow: (patch) =>
    set((state) => ({
      pendingWindow: state.pendingWindow ? { ...state.pendingWindow, ...patch } : null,
    })),

  commitPendingWindow: () => {
    const { pendingWindow, room, doors, windows } = get();
    if (!pendingWindow) return;

    const newWindow: Window = { ...pendingWindow, id: createId() };
    newWindow.offset = constrainOpeningOffset(
      newWindow.wall,
      newWindow.offset,
      newWindow.width,
      room
    );

    const validation = validateWindowPlacement(newWindow, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "유효하지 않은 창문 배치"] });
      return;
    }

    const { past, future } = pushSnapshotFromState(get);
    set({
      windows: [...windows, newWindow],
      pendingWindow: null,
      selectedEntity: { kind: "window", id: newWindow.id },
      historyPast: past,
      historyFuture: future,
      validationErrors: [],
    });
  },

  addDoor: (wall, offset) => {
    const { room, doors, windows } = get();
    const newDoor: Door = { id: createId(), wall, offset: offset ?? 0, ...DEFAULT_DOOR };
    newDoor.offset = constrainOpeningOffset(wall, newDoor.offset, newDoor.width, room);

    const validation = validateDoorPlacement(newDoor, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "Invalid door placement"] });
      return;
    }

    const { past, future } = pushSnapshotFromState(get);
    set({
      doors: [...doors, newDoor],
      selectedEntity: { kind: "door", id: newDoor.id },
      historyPast: past,
      historyFuture: future,
      validationErrors: [],
    });
  },

  updateDoor: (id, patch) => {
    const { room, doors, windows } = get();
    const updatedDoors = doors.map((door) => {
      if (door.id !== id) return door;
      const updated = { ...door, ...patch };
      if (patch.offset !== undefined || patch.width !== undefined) {
        updated.offset = constrainOpeningOffset(updated.wall, updated.offset, updated.width, room);
      }
      return updated;
    });

    const updatedDoor = updatedDoors.find((d) => d.id === id);
    if (updatedDoor) {
      const validation = validateDoorPlacement(updatedDoor, updatedDoors, windows, room);
      if (!validation.valid) {
        set({ validationErrors: [validation.error || "Invalid door placement"] });
        return;
      }
    }

    set({ doors: updatedDoors, validationErrors: [] });
  },

  removeDoor: (id) => {
    const { past, future } = pushSnapshotFromState(get);
    set((state) => ({
      doors: state.doors.filter((door) => door.id !== id),
      selectedEntity:
        state.selectedEntity?.kind === "door" && state.selectedEntity.id === id
          ? null
          : state.selectedEntity,
      historyPast: past,
      historyFuture: future,
    }));
  },

  addWindow: (wall, offset) => {
    const { room, doors, windows } = get();
    const newWindow: Window = { id: createId(), wall, offset: offset ?? 0, ...DEFAULT_WINDOW };
    newWindow.offset = constrainOpeningOffset(wall, newWindow.offset, newWindow.width, room);

    const validation = validateWindowPlacement(newWindow, doors, windows, room);
    if (!validation.valid) {
      set({ validationErrors: [validation.error || "Invalid window placement"] });
      return;
    }

    const { past, future } = pushSnapshotFromState(get);
    set({
      windows: [...windows, newWindow],
      selectedEntity: { kind: "window", id: newWindow.id },
      historyPast: past,
      historyFuture: future,
      validationErrors: [],
    });
  },

  updateWindow: (id, patch) => {
    const { room, doors, windows } = get();
    const updatedWindows = windows.map((window) => {
      if (window.id !== id) return window;
      const updated = { ...window, ...patch };
      if (patch.offset !== undefined || patch.width !== undefined) {
        updated.offset = constrainOpeningOffset(updated.wall, updated.offset, updated.width, room);
      }
      return updated;
    });

    const updatedWindow = updatedWindows.find((w) => w.id === id);
    if (updatedWindow) {
      const validation = validateWindowPlacement(updatedWindow, doors, updatedWindows, room);
      if (!validation.valid) {
        set({ validationErrors: [validation.error || "Invalid window placement"] });
        return;
      }
    }

    set({ windows: updatedWindows, validationErrors: [] });
  },

  removeWindow: (id) => {
    const { past, future } = pushSnapshotFromState(get);
    set((state) => ({
      windows: state.windows.filter((window) => window.id !== id),
      selectedEntity:
        state.selectedEntity?.kind === "window" && state.selectedEntity.id === id
          ? null
          : state.selectedEntity,
      historyPast: past,
      historyFuture: future,
    }));
  },
});
