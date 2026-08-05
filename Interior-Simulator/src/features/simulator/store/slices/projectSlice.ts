import type { StateCreator } from "zustand";
import type {
  InteriorProject,
  ProjectAsset,
  StructureRevision,
} from "../../domain/project";
import type { Scenario } from "../../domain/scenario";
import type {
  MaterialAssignment,
  MaterialSurface,
} from "../../domain/scenario";
import {
  createRectangleStructure,
  validateStructure,
} from "../../domain/structure";
import { DEFAULT_ROOM } from "../../constants";
import { createId } from "../createId";
import type { SimulatorState } from "../useSimulatorStore";

function now(): string {
  return new Date().toISOString();
}

function defaultStructure() {
  return createRectangleStructure({
    width: DEFAULT_ROOM.width,
    height: DEFAULT_ROOM.height,
    wallThickness: DEFAULT_ROOM.wallThickness,
    ceilingHeight: DEFAULT_ROOM.ceilingHeight,
    wallColor: DEFAULT_ROOM.wallColor,
    floorColor: DEFAULT_ROOM.floorColor,
  });
}

const initialTimestamp = now();
const initialRevisionId = createId();
const initialScenarioId = createId();

export type ProjectSliceState = {
  projectId: string;
  projectName: string;
  projectCreatedAt: string;
  projectAssets: ProjectAsset[];
  structureRevisions: StructureRevision[];
  activeStructureRevisionId: string;
  scenarios: Scenario[];
  activeScenarioId: string;
  activeMaterials: MaterialAssignment[];
  setProjectName: (name: string) => void;
  createNewProject: (name?: string) => string;
  registerProjectAsset: (asset: ProjectAsset) => void;
  unregisterProjectAsset: (assetId: string) => void;
  createStructureRevision: (name: string) => string;
  restoreStructureRevision: (id: string) => void;
  renameStructureRevision: (id: string, name: string) => void;
  createScenario: (name: string) => string;
  duplicateScenario: (id: string, name?: string) => string | null;
  switchScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
  syncActiveScenario: () => void;
  setScenarioMaterial: (
    targetId: string,
    surface: MaterialSurface,
    color: string
  ) => void;
  snapshotProject: () => InteriorProject;
  importProject: (project: InteriorProject) => void;
};

function syncScenarioFurniture(
  scenarios: Scenario[],
  activeScenarioId: string,
  furniture: SimulatorState["furniture"],
  materials: MaterialAssignment[]
): Scenario[] {
  const updatedAt = now();
  return scenarios.map((scenario) =>
    scenario.id === activeScenarioId
      ? {
          ...scenario,
          furniture: furniture.map((item) => ({ ...item })),
          materials: materials.map((item) => ({ ...item })),
          updatedAt,
        }
      : scenario
  );
}

export const createProjectSlice: StateCreator<
  SimulatorState,
  [],
  [],
  ProjectSliceState
> = (set, get) => ({
  projectId: createId(),
  projectName: "나의 집",
  projectCreatedAt: initialTimestamp,
  projectAssets: [],
  structureRevisions: [
    {
      id: initialRevisionId,
      name: "기본 구조",
      origin: "default",
      structure: defaultStructure(),
      createdAt: initialTimestamp,
    },
  ],
  activeStructureRevisionId: initialRevisionId,
  scenarios: [
    {
      id: initialScenarioId,
      name: "현재 배치",
      structureRevisionId: initialRevisionId,
      furniture: [],
      materials: [],
      createdAt: initialTimestamp,
      updatedAt: initialTimestamp,
    },
  ],
  activeScenarioId: initialScenarioId,
  activeMaterials: [],

  setProjectName: (projectName) => set({ projectName }),

  createNewProject: (name) => {
    const timestamp = now();
    const projectId = createId();
    const revisionId = createId();
    const scenarioId = createId();
    const structure = defaultStructure();
    set({
      projectId,
      projectName: name?.trim() || "새 집 프로젝트",
      projectCreatedAt: timestamp,
      projectAssets: [],
      floorPlanSources: [],
      floorPlanObjectUrls: {},
      activeFloorPlanSourceId: null,
      structure,
      structureRevisions: [
        {
          id: revisionId,
          name: "기본 구조",
          origin: "default",
          structure: structuredClone(structure),
          createdAt: timestamp,
        },
      ],
      activeStructureRevisionId: revisionId,
      scenarios: [
        {
          id: scenarioId,
          name: "현재 배치",
          structureRevisionId: revisionId,
          furniture: [],
          materials: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      activeScenarioId: scenarioId,
      activeMaterials: [],
      furniture: [],
      memoryPins: [],
      savedViewpoints: [],
      selectedMemoryPinId: null,
      activeViewpointId: null,
      memorySearch: "",
      navigationMode: "orbit",
      detectionStatus: "idle",
      detectionCandidates: [],
      detectionError: null,
      selectedDetectionCandidateId: null,
      structurePast: [],
      structureFuture: [],
      historyPast: [],
      historyFuture: [],
      selectedEntity: null,
      selectedStructureEntity: null,
    });
    return projectId;
  },

  registerProjectAsset: (asset) =>
    set((state) => ({
      projectAssets: [
        ...state.projectAssets.filter((item) => item.id !== asset.id),
        asset,
      ],
    })),

  unregisterProjectAsset: (assetId) =>
    set((state) => ({
      projectAssets: state.projectAssets.filter((asset) => asset.id !== assetId),
    })),

  createStructureRevision: (name) => {
    const state = get();
    const id = createId();
    const revision: StructureRevision = {
      id,
      name: name.trim() || `구조 ${state.structureRevisions.length + 1}`,
      parentRevisionId: state.activeStructureRevisionId,
      origin: "manual",
      structure: structuredClone(state.structure),
      createdAt: now(),
    };
    set({
      structureRevisions: [...state.structureRevisions, revision],
      activeStructureRevisionId: id,
      scenarios: state.scenarios.map((scenario) =>
        scenario.id === state.activeScenarioId
          ? { ...scenario, structureRevisionId: id, updatedAt: now() }
          : scenario
      ),
    });
    return id;
  },

  restoreStructureRevision: (id) => {
    const state = get();
    const revision = state.structureRevisions.find((item) => item.id === id);
    if (!revision) return;
    set({
      structure: structuredClone(revision.structure),
      structurePast: [],
      structureFuture: [],
      structureIssues: validateStructure(revision.structure),
      selectedStructureEntity: null,
      activeStructureRevisionId: id,
      scenarios: state.scenarios.map((scenario) =>
        scenario.id === state.activeScenarioId
          ? { ...scenario, structureRevisionId: id, updatedAt: now() }
          : scenario
      ),
    });
  },

  renameStructureRevision: (id, name) =>
    set((state) => ({
      structureRevisions: state.structureRevisions.map((revision) =>
        revision.id === id
          ? { ...revision, name: name.trim() || revision.name }
          : revision
      ),
    })),

  createScenario: (name) => {
    const state = get();
    const scenarios = syncScenarioFurniture(
      state.scenarios,
      state.activeScenarioId,
      state.furniture,
      state.activeMaterials
    );
    const id = createId();
    const timestamp = now();
    const scenario: Scenario = {
      id,
      name: name.trim() || `배치안 ${scenarios.length + 1}`,
      structureRevisionId: state.activeStructureRevisionId,
      furniture: [],
      materials: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set({
      scenarios: [...scenarios, scenario],
      activeScenarioId: id,
      furniture: [],
      activeMaterials: [],
      selectedEntity: null,
    });
    return id;
  },

  duplicateScenario: (id, name) => {
    const state = get();
    const synced = syncScenarioFurniture(
      state.scenarios,
      state.activeScenarioId,
      state.furniture,
      state.activeMaterials
    );
    const source = synced.find((scenario) => scenario.id === id);
    if (!source) return null;
    const nextId = createId();
    const timestamp = now();
    const copy: Scenario = {
      ...structuredClone(source),
      id: nextId,
      name: name?.trim() || `${source.name} 복사본`,
      furniture: source.furniture.map((item) => ({
        ...item,
        id: createId(),
        parentId: undefined,
        attachOffsetX: undefined,
        attachOffsetY: undefined,
      })),
      materials: source.materials.map((item) => ({
        ...item,
        id: createId(),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    set({
      scenarios: [...synced, copy],
      activeScenarioId: nextId,
      furniture: copy.furniture.map((item) => ({ ...item })),
      activeMaterials: copy.materials.map((item) => ({ ...item })),
      selectedEntity: null,
    });
    return nextId;
  },

  switchScenario: (id) => {
    const state = get();
    if (id === state.activeScenarioId) return;
    const scenarios = syncScenarioFurniture(
      state.scenarios,
      state.activeScenarioId,
      state.furniture,
      state.activeMaterials
    );
    const target = scenarios.find((scenario) => scenario.id === id);
    if (!target) return;
    const revision = state.structureRevisions.find(
      (item) => item.id === target.structureRevisionId
    );
    set({
      scenarios,
      activeScenarioId: id,
      furniture: target.furniture.map((item) => ({ ...item })),
      activeMaterials: target.materials.map((item) => ({ ...item })),
      structure: revision
        ? structuredClone(revision.structure)
        : state.structure,
      activeStructureRevisionId:
        revision?.id ?? state.activeStructureRevisionId,
      historyPast: [],
      historyFuture: [],
      structurePast: [],
      structureFuture: [],
      selectedEntity: null,
      selectedStructureEntity: null,
    });
  },

  renameScenario: (id, name) =>
    set((state) => ({
      scenarios: state.scenarios.map((scenario) =>
        scenario.id === id
          ? { ...scenario, name: name.trim() || scenario.name, updatedAt: now() }
          : scenario
      ),
    })),

  deleteScenario: (id) => {
    const state = get();
    if (state.scenarios.length <= 1) return;
    const remaining = state.scenarios.filter((scenario) => scenario.id !== id);
    if (remaining.length === state.scenarios.length) return;
    const next =
      id === state.activeScenarioId
        ? remaining[0]
        : remaining.find((scenario) => scenario.id === state.activeScenarioId) ??
          remaining[0];
    set({
      scenarios: remaining,
      activeScenarioId: next.id,
      furniture: next.furniture.map((item) => ({ ...item })),
      activeMaterials: next.materials.map((item) => ({ ...item })),
      selectedEntity: null,
    });
  },

  syncActiveScenario: () =>
    set((state) => ({
      scenarios: syncScenarioFurniture(
        state.scenarios,
        state.activeScenarioId,
        state.furniture,
        state.activeMaterials
      ),
    })),

  setScenarioMaterial: (targetId, surface, color) =>
    set((state) => {
      const existing = state.activeMaterials.find(
        (item) => item.targetId === targetId && item.surface === surface
      );
      return {
        activeMaterials: existing
          ? state.activeMaterials.map((item) =>
              item.id === existing.id ? { ...item, color } : item
            )
          : [
              ...state.activeMaterials,
              {
                id: createId(),
                targetId,
                surface,
                color,
              },
            ],
      };
    }),

  snapshotProject: () => {
    const state = get();
    const updatedAt = now();
    const scenarios = syncScenarioFurniture(
      state.scenarios,
      state.activeScenarioId,
      state.furniture,
      state.activeMaterials
    );
    const revisions = state.structureRevisions.map((revision) =>
      revision.id === state.activeStructureRevisionId
        ? { ...revision, structure: structuredClone(state.structure) }
        : revision
    );
    return {
      version: "2.0.0",
      id: state.projectId,
      name: state.projectName,
      sources: state.floorPlanSources.map((source) => structuredClone(source)),
      assets: state.projectAssets.map((asset) => ({ ...asset })),
      structureRevisions: revisions,
      activeStructureRevisionId: state.activeStructureRevisionId,
      scenarios,
      activeScenarioId: state.activeScenarioId,
      memoryPins: structuredClone(state.memoryPins),
      savedViewpoints: structuredClone(state.savedViewpoints),
      meta: {
        createdAt: state.projectCreatedAt,
        updatedAt,
      },
    };
  },

  importProject: (project) => {
    const revision =
      project.structureRevisions.find(
        (item) => item.id === project.activeStructureRevisionId
      ) ?? project.structureRevisions[0];
    const scenario =
      project.scenarios.find((item) => item.id === project.activeScenarioId) ??
      project.scenarios[0];
    set({
      projectId: project.id,
      projectName: project.name,
      projectCreatedAt: project.meta.createdAt,
      projectAssets: project.assets.map((asset) => ({ ...asset })),
      structureRevisions: structuredClone(project.structureRevisions),
      activeStructureRevisionId: revision.id,
      scenarios: structuredClone(project.scenarios),
      activeScenarioId: scenario.id,
      floorPlanSources: structuredClone(project.sources),
      floorPlanObjectUrls: {},
      activeFloorPlanSourceId: project.sources[0]?.id ?? null,
      structure: structuredClone(revision.structure),
      furniture: scenario.furniture.map((item) => ({ ...item })),
      activeMaterials: scenario.materials.map((item) => ({ ...item })),
      memoryPins: structuredClone(project.memoryPins),
      savedViewpoints: structuredClone(project.savedViewpoints),
      selectedMemoryPinId: null,
      activeViewpointId: null,
      structurePast: [],
      structureFuture: [],
      historyPast: [],
      historyFuture: [],
      selectedEntity: null,
      selectedStructureEntity: null,
    });
  },
});
