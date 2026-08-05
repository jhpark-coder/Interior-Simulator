import { beforeEach, describe, expect, it } from "vitest";
import { createRectangularStructureFixture } from "../domain/structure";
import type { DetectionCandidate } from "../floorplan/detectionTypes";
import { useSimulatorStore } from "./useSimulatorStore";

const wallCandidate: DetectionCandidate = {
  id: "candidate-wall",
  kind: "wall",
  start: { x: 1000, y: 1000 },
  end: { x: 4000, y: 1000 },
  thickness: 120,
  confidence: 0.82,
  status: "pending",
};

function state() {
  return useSimulatorStore.getState();
}

describe("detectionSlice", () => {
  beforeEach(() => {
    useSimulatorStore.setState({
      structure: createRectangularStructureFixture(),
      detectionStatus: "idle",
      detectionCandidates: [],
      detectionRuns: [],
      detectionError: null,
      selectedDetectionCandidateId: null,
      structurePast: [],
      structureFuture: [],
    });
  });

  it("keeps candidates separate until the user accepts one", () => {
    state().setDetectionResult([wallCandidate], {
      sourceId: "source-1",
      elapsedMs: 12,
      threshold: 120,
      estimatedSkewDegrees: 0,
      wallCandidateCount: 1,
      openingCandidateCount: 0,
      labelCandidateCount: 0,
      calibrated: true,
    });
    expect(state().structure.walls).toHaveLength(4);
    expect(state().detectionCandidates[0].status).toBe("pending");

    expect(state().acceptDetectionCandidate("candidate-wall")).toBe(true);
    expect(state().structure.walls).toHaveLength(5);
    expect(state().structure.walls[4].source.origin).toBe("detected");
    expect(state().structure.walls[4].source.confirmedByUser).toBe(true);
  });

  it("does not mutate manually confirmed walls when analysis is rerun", () => {
    const manualWalls = structuredClone(state().structure.walls);
    state().setDetectionResult([wallCandidate], {
      sourceId: "source-1",
      elapsedMs: 12,
      threshold: 120,
      estimatedSkewDegrees: 0,
      wallCandidateCount: 1,
      openingCandidateCount: 0,
      labelCandidateCount: 0,
      calibrated: false,
    });
    state().rejectDetectionCandidate("candidate-wall");
    state().setDetectionResult([], {
      sourceId: "source-1",
      elapsedMs: 8,
      threshold: 130,
      estimatedSkewDegrees: 0,
      wallCandidateCount: 0,
      openingCandidateCount: 0,
      labelCandidateCount: 0,
      calibrated: false,
    });
    expect(state().structure.walls).toEqual(manualWalls);
  });
});
