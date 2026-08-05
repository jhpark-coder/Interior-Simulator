import type { StateCreator } from "zustand";
import type { Door, FurnitureItem, LayoutDoc, Room, Window } from "../../types";
import type { SimulatorState } from "../useSimulatorStore";
import { createHistory, pushHistory, undoHistory, redoHistory } from "../history";
import { computeChildWorldPos } from "../../utils";

export type HistorySliceState = {
  historyPast: LayoutDoc[];
  historyFuture: LayoutDoc[];
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  importLayout: (layout: LayoutDoc) => void;
  exportLayout: () => LayoutDoc;
  snapshot: () => LayoutDoc;
};

function buildLayoutDoc(
  room: Room,
  furniture: FurnitureItem[],
  doors: Door[],
  windows: Window[]
): LayoutDoc {
  const now = new Date().toISOString();
  return {
    version: "1.2.0",
    room,
    furniture,
    doors,
    windows,
    meta: { createdAt: now, updatedAt: now },
  };
}

export function pushSnapshotFromState(
  get: () => Pick<SimulatorState, "snapshot" | "historyPast" | "historyFuture">
): { past: LayoutDoc[]; future: LayoutDoc[] } {
  const snapshot = get().snapshot();
  const history = createHistory<LayoutDoc>(30);
  history.past = get().historyPast;
  history.future = get().historyFuture;
  const newHistory = pushHistory(history, snapshot);
  return { past: newHistory.past, future: newHistory.future };
}

export const createHistorySlice: StateCreator<
  SimulatorState,
  [],
  [],
  HistorySliceState
> = (set, get) => ({
  historyPast: [],
  historyFuture: [],

  commitHistory: () => {
    const { past, future } = pushSnapshotFromState(get);
    set({ historyPast: past, historyFuture: future });
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
    const furniture = layout.furniture.map((f) => {
      if (f.parentId && !allIds.has(f.parentId)) {
        const { parentId: _, attachOffsetX: _ox, attachOffsetY: _oy, ...rest } = f;
        return rest as FurnitureItem;
      }
      if (f.parentId) {
        const parent = layout.furniture.find((p) => p.id === f.parentId);
        if (parent) {
          const worldPos = computeChildWorldPos(
            f.attachOffsetX ?? 0,
            f.attachOffsetY ?? 0,
            parent
          );
          return { ...f, x: worldPos.x - f.width / 2, y: worldPos.y - f.depth / 2 };
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

  exportLayout: () => get().snapshot(),

  snapshot: () => {
    const { room, furniture, doors, windows } = get();
    return buildLayoutDoc(room, furniture, doors, windows);
  },
});
