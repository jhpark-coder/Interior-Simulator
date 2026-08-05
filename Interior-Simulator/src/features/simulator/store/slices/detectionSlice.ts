import type { StateCreator } from "zustand";
import {
  pointInPolygon,
  polygonCentroid,
  projectPointToWall,
} from "../../domain/structure";
import type {
  DetectionCandidate,
  DetectionRunSummary,
} from "../../floorplan/detectionTypes";
import { createId } from "../createId";
import type { SimulatorState } from "../useSimulatorStore";

export type DetectionProcessStatus =
  | "idle"
  | "analyzing"
  | "review"
  | "error";

export type DetectionSliceState = {
  detectionStatus: DetectionProcessStatus;
  detectionCandidates: DetectionCandidate[];
  detectionRuns: DetectionRunSummary[];
  detectionError: string | null;
  selectedDetectionCandidateId: string | null;
  beginDetection: () => void;
  setDetectionResult: (
    candidates: DetectionCandidate[],
    summary: Omit<DetectionRunSummary, "id" | "createdAt">
  ) => void;
  failDetection: (message: string) => void;
  clearDetectionCandidates: () => void;
  selectDetectionCandidate: (id: string | null) => void;
  acceptDetectionCandidate: (id: string) => boolean;
  rejectDetectionCandidate: (id: string) => void;
  acceptAllDetectionCandidates: () => number;
};

function applyCandidate(
  candidate: DetectionCandidate,
  state: SimulatorState
): string | null {
  if (candidate.kind === "wall") {
    return state.addWall(candidate.start, candidate.end, {
      thickness: candidate.thickness,
      kind: "interior",
      source: {
        origin: "detected",
        confidence: candidate.confidence,
        confirmedByUser: true,
      },
    });
  }
  if (candidate.kind === "opening") {
    const nearest = state.structure.walls
      .map((wall) => ({
        wall,
        projection: projectPointToWall(candidate.position, wall),
      }))
      .sort((a, b) => a.projection.distance - b.projection.distance)[0];
    if (
      !nearest ||
      nearest.projection.distance > Math.max(500, candidate.width)
    ) {
      return null;
    }
    return state.addStructureOpening({
      kind: candidate.suggestedKind,
      wallId: nearest.wall.id,
      offset: Math.max(
        0,
        nearest.projection.offset - candidate.width / 2
      ),
      width: candidate.width,
      height: candidate.suggestedKind === "door" ? 2100 : 1200,
      sillHeight: candidate.suggestedKind === "door" ? 0 : 900,
      source: {
        origin: "detected",
        confidence: candidate.confidence,
        confirmedByUser: true,
      },
    });
  }
  const targetRoom =
    state.structure.rooms.find((room) =>
      pointInPolygon(candidate.position, room.polygon)
    ) ??
    [...state.structure.rooms].sort((left, right) => {
      const leftCenter = polygonCentroid(left.polygon);
      const rightCenter = polygonCentroid(right.polygon);
      return (
        Math.hypot(
          leftCenter.x - candidate.position.x,
          leftCenter.y - candidate.position.y
        ) -
        Math.hypot(
          rightCenter.x - candidate.position.x,
          rightCenter.y - candidate.position.y
        )
      );
    })[0];
  if (!targetRoom || !candidate.text.trim()) return null;
  state.updateStructureRoom(targetRoom.id, {
    name: candidate.text.trim(),
    source: {
      origin: "detected",
      confidence: candidate.confidence,
      confirmedByUser: true,
    },
  });
  return targetRoom.id;
}

export const createDetectionSlice: StateCreator<
  SimulatorState,
  [],
  [],
  DetectionSliceState
> = (set, get) => ({
  detectionStatus: "idle",
  detectionCandidates: [],
  detectionRuns: [],
  detectionError: null,
  selectedDetectionCandidateId: null,

  beginDetection: () =>
    set({
      detectionStatus: "analyzing",
      detectionError: null,
      selectedDetectionCandidateId: null,
    }),

  setDetectionResult: (detectionCandidates, summary) =>
    set((state) => ({
      detectionStatus: "review",
      detectionCandidates,
      detectionError: null,
      selectedDetectionCandidateId: detectionCandidates[0]?.id ?? null,
      detectionRuns: [
        ...state.detectionRuns.slice(-19),
        {
          ...summary,
          id: createId(),
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  failDetection: (detectionError) =>
    set({ detectionStatus: "error", detectionError }),

  clearDetectionCandidates: () =>
    set({
      detectionStatus: "idle",
      detectionCandidates: [],
      detectionError: null,
      selectedDetectionCandidateId: null,
    }),

  selectDetectionCandidate: (selectedDetectionCandidateId) =>
    set({ selectedDetectionCandidateId }),

  acceptDetectionCandidate: (id) => {
    const state = get();
    const candidate = state.detectionCandidates.find(
      (item) => item.id === id
    );
    if (!candidate || candidate.status !== "pending") return false;
    const appliedEntityId = applyCandidate(candidate, state);
    if (!appliedEntityId) return false;
    set({
      detectionCandidates: get().detectionCandidates.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "accepted",
              appliedEntityId,
            }
          : item
      ),
    });
    return true;
  },

  rejectDetectionCandidate: (id) =>
    set((state) => ({
      detectionCandidates: state.detectionCandidates.map((candidate) =>
        candidate.id === id && candidate.status === "pending"
          ? { ...candidate, status: "rejected" }
          : candidate
      ),
    })),

  acceptAllDetectionCandidates: () => {
    const pending = get().detectionCandidates.filter(
      (candidate) => candidate.status === "pending"
    );
    const ordered = [
      ...pending.filter((candidate) => candidate.kind === "wall"),
      ...pending.filter((candidate) => candidate.kind === "opening"),
      ...pending.filter((candidate) => candidate.kind === "label"),
    ];
    let accepted = 0;
    ordered.forEach((candidate) => {
      if (get().acceptDetectionCandidate(candidate.id)) accepted += 1;
    });
    return accepted;
  },
});
