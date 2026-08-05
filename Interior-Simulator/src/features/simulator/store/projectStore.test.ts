import { beforeEach, describe, expect, it } from "vitest";
import { validateInteriorProject } from "../domain/project";
import { createRectangularStructureFixture } from "../domain/structure";
import { useSimulatorStore } from "./useSimulatorStore";

const createdAt = "2026-08-05T00:00:00.000Z";

function resetProjectStore() {
  const structure = createRectangularStructureFixture();
  useSimulatorStore.setState({
    projectId: "project-test",
    projectName: "테스트 집",
    projectCreatedAt: createdAt,
    projectAssets: [],
    structure,
    structureRevisions: [
      {
        id: "revision-1",
        name: "기본 구조",
        origin: "manual",
        structure: structuredClone(structure),
        createdAt,
      },
    ],
    activeStructureRevisionId: "revision-1",
    scenarios: [
      {
        id: "scenario-1",
        name: "현재 배치",
        structureRevisionId: "revision-1",
        furniture: [],
        materials: [],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    activeScenarioId: "scenario-1",
    activeMaterials: [],
    furniture: [],
    floorPlanSources: [],
    floorPlanObjectUrls: {},
    activeFloorPlanSourceId: null,
    memoryPins: [],
    savedViewpoints: [],
    selectedMemoryPinId: null,
    activeViewpointId: null,
    memorySearch: "",
    navigationMode: "orbit",
    structurePast: [],
    structureFuture: [],
    historyPast: [],
    historyFuture: [],
  });
}

function state() {
  return useSimulatorStore.getState();
}

describe("projectSlice", () => {
  beforeEach(resetProjectStore);

  it("creates independent scenarios and restores their furniture", () => {
    state().addFurniture("desk");
    const firstFurnitureId = state().furniture[0].id;
    const secondId = state().createScenario("빈집");
    expect(state().activeScenarioId).toBe(secondId);
    expect(state().furniture).toHaveLength(0);

    state().switchScenario("scenario-1");
    expect(state().furniture[0].id).toBe(firstFurnitureId);
    state().switchScenario(secondId);
    expect(state().furniture).toHaveLength(0);
  });

  it("duplicates a scenario without sharing furniture ids", () => {
    state().addFurniture("chair");
    state().syncActiveScenario();
    const copyId = state().duplicateScenario("scenario-1", "의자 배치 복사");
    expect(copyId).not.toBeNull();
    expect(state().furniture).toHaveLength(1);
    expect(state().furniture[0].id).not.toBe(
      state().scenarios.find((item) => item.id === "scenario-1")?.furniture[0].id
    );
  });

  it("keeps finish materials independent between scenarios", () => {
    state().setScenarioMaterial("all-walls", "wall", "#ddeeff");
    const secondId = state().createScenario("어두운 배치");
    state().setScenarioMaterial("all-walls", "wall", "#222222");

    state().switchScenario("scenario-1");
    expect(state().activeMaterials[0].color).toBe("#ddeeff");
    state().switchScenario(secondId);
    expect(state().activeMaterials[0].color).toBe("#222222");
  });

  it("creates and restores structure revisions", () => {
    state().removeWall("rect-east");
    const revisionId = state().createStructureRevision("동쪽 벽 제거");
    expect(state().structureRevisions).toHaveLength(2);
    state().restoreStructureRevision("revision-1");
    expect(state().structure.walls).toHaveLength(4);
    expect(state().structurePast).toHaveLength(0);
    state().renameStructureRevision("revision-1", "원본 평면");
    expect(state().structureRevisions[0].name).toBe("원본 평면");
    state().restoreStructureRevision(revisionId);
    expect(state().structure.walls).toHaveLength(3);
  });

  it("does not delete the final scenario", () => {
    state().deleteScenario("scenario-1");
    expect(state().scenarios).toHaveLength(1);
  });

  it("creates a schema-valid project snapshot", () => {
    state().addFurniture("table");
    const project = state().snapshotProject();
    const validation = validateInteriorProject(project);
    expect(validation.success).toBe(true);
    expect(project.scenarios[0].furniture).toHaveLength(1);
    expect(project.structureRevisions[0].structure).toEqual(state().structure);
  });

  it("imports project state and active scenario", () => {
    state().addFurniture("bed");
    const project = state().snapshotProject();
    state().createScenario("다른 배치");
    expect(state().furniture).toHaveLength(0);
    state().importProject(project);
    expect(state().projectName).toBe("테스트 집");
    expect(state().activeScenarioId).toBe("scenario-1");
    expect(state().furniture[0].type).toBe("bed");
  });

  it("round trips memory pins and saved viewpoints", () => {
    const pinId = state().addMemoryPin({ x: 1000, y: 1000 });
    state().updateMemoryPin(pinId, { note: "창가 사진" });
    state().addSavedViewpoint(
      "창가",
      { x: 1000, y: 1600, z: 1000 },
      { x: 2000, y: 1400, z: 1000 }
    );
    const project = state().snapshotProject();

    useSimulatorStore.setState({ memoryPins: [], savedViewpoints: [] });
    state().importProject(project);

    expect(state().memoryPins[0].note).toBe("창가 사진");
    expect(state().savedViewpoints[0].name).toBe("창가");
  });

  it("creates a clean independent project", () => {
    state().addFurniture("desk");
    state().addMemoryPin({ x: 1000, y: 1000 });
    state().setMemorySearch("창가");
    state().setNavigationMode("walk");
    const oldProjectId = state().projectId;
    const newProjectId = state().createNewProject("새 아파트");

    expect(newProjectId).not.toBe(oldProjectId);
    expect(state().projectName).toBe("새 아파트");
    expect(state().furniture).toEqual([]);
    expect(state().memoryPins).toEqual([]);
    expect(state().memorySearch).toBe("");
    expect(state().navigationMode).toBe("orbit");
    expect(state().scenarios).toHaveLength(1);
    expect(state().structureRevisions).toHaveLength(1);
  });
});
