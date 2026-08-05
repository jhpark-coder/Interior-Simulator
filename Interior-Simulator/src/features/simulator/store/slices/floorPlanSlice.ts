import type { StateCreator } from "zustand";
import {
  averageCalibrationScale,
  type CalibrationAnchor,
  type FloorPlanSource,
} from "../../domain/import";
import { createId } from "../createId";
import type { SimulatorState } from "../useSimulatorStore";

export type AddFloorPlanSourceInput = Pick<
  FloorPlanSource,
  "fileName" | "mimeType" | "assetId" | "widthPx" | "heightPx"
> & {
  objectUrl: string;
  originalAssetId?: string;
  pageNumber?: number;
};

export type FloorPlanSliceState = {
  floorPlanSources: FloorPlanSource[];
  floorPlanObjectUrls: Record<string, string>;
  activeFloorPlanSourceId: string | null;
  addFloorPlanSource: (input: AddFloorPlanSourceInput) => string;
  updateFloorPlanSource: (
    id: string,
    patch: Partial<Omit<FloorPlanSource, "id">>
  ) => void;
  removeFloorPlanSource: (id: string) => void;
  setActiveFloorPlanSource: (id: string | null) => void;
  addCalibrationAnchor: (
    sourceId: string,
    anchor: Omit<CalibrationAnchor, "id">
  ) => void;
  clearCalibration: (sourceId: string) => void;
  setFloorPlanObjectUrl: (assetId: string, objectUrl: string) => void;
};

export const createFloorPlanSlice: StateCreator<
  SimulatorState,
  [],
  [],
  FloorPlanSliceState
> = (set) => ({
  floorPlanSources: [],
  floorPlanObjectUrls: {},
  activeFloorPlanSourceId: null,

  addFloorPlanSource: (input) => {
    const id = createId();
    const source: FloorPlanSource = {
      id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      assetId: input.assetId,
      originalAssetId: input.originalAssetId,
      pageNumber: input.pageNumber,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      opacity: 0.55,
      visible: true,
      locked: true,
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleMmPerPixel: null,
      },
      adjustments: {
        brightness: 0,
        contrast: 0,
        threshold: null,
        grayscale: false,
      },
      calibrationAnchors: [],
    };
    set((state) => ({
      floorPlanSources: [...state.floorPlanSources, source],
      floorPlanObjectUrls: {
        ...state.floorPlanObjectUrls,
        [source.assetId]: input.objectUrl,
      },
      activeFloorPlanSourceId: id,
      structureTool: "calibrate",
    }));
    return id;
  },

  updateFloorPlanSource: (id, patch) =>
    set((state) => ({
      floorPlanSources: state.floorPlanSources.map((source) =>
        source.id === id ? { ...source, ...patch, id } : source
      ),
    })),

  removeFloorPlanSource: (id) =>
    set((state) => {
      const source = state.floorPlanSources.find((candidate) => candidate.id === id);
      const floorPlanObjectUrls = { ...state.floorPlanObjectUrls };
      if (source) delete floorPlanObjectUrls[source.assetId];
      const remaining = state.floorPlanSources.filter(
        (candidate) => candidate.id !== id
      );
      return {
        floorPlanSources: remaining,
        floorPlanObjectUrls,
        activeFloorPlanSourceId:
          state.activeFloorPlanSourceId === id
            ? (remaining[0]?.id ?? null)
            : state.activeFloorPlanSourceId,
      };
    }),

  setActiveFloorPlanSource: (activeFloorPlanSourceId) =>
    set({ activeFloorPlanSourceId }),

  addCalibrationAnchor: (sourceId, input) =>
    set((state) => ({
      floorPlanSources: state.floorPlanSources.map((source) => {
        if (source.id !== sourceId) return source;
        const calibrationAnchors = [
          ...source.calibrationAnchors,
          { ...input, id: createId() },
        ];
        return {
          ...source,
          calibrationAnchors,
          transform: {
            ...source.transform,
            scaleMmPerPixel: averageCalibrationScale(calibrationAnchors),
          },
        };
      }),
      structureTool: "select",
    })),

  clearCalibration: (sourceId) =>
    set((state) => ({
      floorPlanSources: state.floorPlanSources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              calibrationAnchors: [],
              transform: { ...source.transform, scaleMmPerPixel: null },
            }
          : source
      ),
    })),

  setFloorPlanObjectUrl: (assetId, objectUrl) =>
    set((state) => ({
      floorPlanObjectUrls: {
        ...state.floorPlanObjectUrls,
        [assetId]: objectUrl,
      },
    })),
});
