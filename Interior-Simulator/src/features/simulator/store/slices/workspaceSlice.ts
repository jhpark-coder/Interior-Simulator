import type { StateCreator } from "zustand";
import type { SimulatorState } from "../useSimulatorStore";

export type WorkspaceMode = "structure" | "scenario" | "memory";
export type StructureTool =
  | "select"
  | "pan"
  | "wall"
  | "door"
  | "window"
  | "calibrate"
  | "memory-pin";

export type WorkspaceSliceState = {
  workspaceMode: WorkspaceMode;
  structureTool: StructureTool;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setStructureTool: (tool: StructureTool) => void;
};

export const createWorkspaceSlice: StateCreator<
  SimulatorState,
  [],
  [],
  WorkspaceSliceState
> = (set) => ({
  workspaceMode: "structure",
  structureTool: "select",
  setWorkspaceMode: (workspaceMode) =>
    set({
      workspaceMode,
      structureTool: workspaceMode === "memory" ? "memory-pin" : "select",
      selectedStructureEntity: null,
    }),
  setStructureTool: (structureTool) =>
    set({ structureTool, selectedStructureEntity: null }),
});
