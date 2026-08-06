import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { InteriorProject } from "../../domain/project";
import { createRectangularStructureFixture } from "../../domain/structure";
import {
  closeProjectDatabaseForTests,
  deleteProject,
  deleteProjectAssets,
  listProjects,
  loadProject,
  loadProjectAsset,
  saveProject,
  saveProjectAsset,
} from "./projectDb";

function projectFixture(id: string): InteriorProject {
  const timestamp = "2026-08-05T00:00:00.000Z";
  const structure = createRectangularStructureFixture();
  return {
    version: "2.0.0",
    id,
    name: `프로젝트 ${id}`,
    sources: [],
    assets: [],
    structureRevisions: [
      {
        id: "revision-1",
        name: "기본",
        origin: "manual",
        structure,
        createdAt: timestamp,
      },
    ],
    activeStructureRevisionId: "revision-1",
    scenarios: [
      {
        id: "scenario-1",
        name: "현재",
        structureRevisionId: "revision-1",
        furniture: [],
        materials: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    activeScenarioId: "scenario-1",
    memoryPins: [],
    savedViewpoints: [],
    meta: { createdAt: timestamp, updatedAt: timestamp },
  };
}

describe("projectDb", () => {
  beforeEach(async () => {
    await closeProjectDatabaseForTests();
    await deleteDB("interior-simulator");
  });

  afterEach(async () => {
    await closeProjectDatabaseForTests();
  });

  it("saves, lists, and reloads a project", async () => {
    const project = projectFixture("project-db");
    await saveProject(project);
    expect(await loadProject(project.id)).toEqual(project);
    expect(await listProjects()).toEqual([
      {
        id: project.id,
        name: project.name,
        updatedAt: project.meta.updatedAt,
      },
    ]);
  });

  it("stores binary assets separately and deletes them with a project", async () => {
    const project = projectFixture("project-assets");
    const blob = new Blob(["floor plan"], { type: "image/png" });
    await saveProject(project);
    await saveProjectAsset(project.id, "asset-1", blob);
    const loaded = await loadProjectAsset(project.id, "asset-1");
    expect(loaded).not.toBeNull();

    await deleteProject(project.id);
    expect(await loadProject(project.id)).toBeNull();
    expect(await loadProjectAsset(project.id, "asset-1")).toBeNull();
  });

  it("deletes multiple project assets in one operation", async () => {
    const project = projectFixture("project-multiple-assets");
    await saveProject(project);
    await saveProjectAsset(project.id, "asset-1", new Blob(["one"]));
    await saveProjectAsset(project.id, "asset-2", new Blob(["two"]));

    await deleteProjectAssets(project.id, ["asset-1", "asset-2"]);

    expect(await loadProjectAsset(project.id, "asset-1")).toBeNull();
    expect(await loadProjectAsset(project.id, "asset-2")).toBeNull();
  });
});
