import { create } from "zustand";
import { createRoomSlice } from "./slices/roomSlice";
import { createFurnitureSlice } from "./slices/furnitureSlice";
import { createOpeningSlice } from "./slices/openingSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createStructureSlice } from "./slices/structureSlice";
import { createWorkspaceSlice } from "./slices/workspaceSlice";
import { createFloorPlanSlice } from "./slices/floorPlanSlice";
import { createProjectSlice } from "./slices/projectSlice";
import { createMemorySlice } from "./slices/memorySlice";
import { createDetectionSlice } from "./slices/detectionSlice";
import type { RoomSliceState } from "./slices/roomSlice";
import type { FurnitureSliceState } from "./slices/furnitureSlice";
import type { OpeningSliceState } from "./slices/openingSlice";
import type { HistorySliceState } from "./slices/historySlice";
import type { StructureSliceState } from "./slices/structureSlice";
import type { WorkspaceSliceState } from "./slices/workspaceSlice";
import type { FloorPlanSliceState } from "./slices/floorPlanSlice";
import type { ProjectSliceState } from "./slices/projectSlice";
import type { MemorySliceState } from "./slices/memorySlice";
import type { DetectionSliceState } from "./slices/detectionSlice";

export type SimulatorState = RoomSliceState &
  FurnitureSliceState &
  OpeningSliceState &
  HistorySliceState &
  StructureSliceState &
  WorkspaceSliceState &
  FloorPlanSliceState &
  ProjectSliceState &
  MemorySliceState &
  DetectionSliceState;

export const useSimulatorStore = create<SimulatorState>()((...a) => ({
  ...createRoomSlice(...a),
  ...createFurnitureSlice(...a),
  ...createOpeningSlice(...a),
  ...createHistorySlice(...a),
  ...createStructureSlice(...a),
  ...createWorkspaceSlice(...a),
  ...createFloorPlanSlice(...a),
  ...createProjectSlice(...a),
  ...createMemorySlice(...a),
  ...createDetectionSlice(...a),
}));
