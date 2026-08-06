import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRectangularStructureFixture } from "../../domain/structure";
import { useSimulatorStore } from "../useSimulatorStore";
import { closeProjectDatabaseForTests, loadProject } from "./projectDb";
import { saveActiveProjectBeforeTransition } from "./projectTransition";

const createdAt = "2026-08-06T00:00:00.000Z";

describe("saveActiveProjectBeforeTransition", () => {
  beforeEach(async () => {
    await closeProjectDatabaseForTests();
    await deleteDB("interior-simulator");
    const structure = createRectangularStructureFixture();
    useSimulatorStore.setState({
      projectId: "project-before-transition",
      projectName: "전환 전 프로젝트",
      projectCreatedAt: createdAt,
      projectAssets: [],
      structure,
      structureRevisions: [
        {
          id: "revision-transition",
          name: "기본 구조",
          origin: "manual",
          structure: structuredClone(structure),
          createdAt,
        },
      ],
      activeStructureRevisionId: "revision-transition",
      scenarios: [
        {
          id: "scenario-transition",
          name: "현재 배치",
          structureRevisionId: "revision-transition",
          furniture: [],
          materials: [],
          createdAt,
          updatedAt: createdAt,
        },
      ],
      activeScenarioId: "scenario-transition",
      activeMaterials: [],
      furniture: [],
      floorPlanSources: [],
      floorPlanObjectUrls: {},
      activeFloorPlanSourceId: null,
      memoryPins: [],
      savedViewpoints: [],
    });
  });

  afterEach(async () => {
    await closeProjectDatabaseForTests();
  });

  it("persists the current snapshot before another project replaces store state", async () => {
    useSimulatorStore.getState().addFurniture("desk");

    const saved = await saveActiveProjectBeforeTransition();
    useSimulatorStore.getState().createNewProject("다음 프로젝트");

    const restored = await loadProject(saved.id);
    expect(restored?.name).toBe("전환 전 프로젝트");
    expect(restored?.scenarios[0].furniture).toHaveLength(1);
  });
});
