import { describe, expect, it } from "vitest";
import type { InteriorProject } from "../../domain/project";
import { createRectangularStructureFixture } from "../../domain/structure";
import {
  createProjectPackage,
  readProjectPackage,
} from "./projectPackage";

function packageProject(): InteriorProject {
  const timestamp = "2026-08-05T00:00:00.000Z";
  const structure = createRectangularStructureFixture();
  return {
    version: "2.0.0",
    id: "package-project",
    name: "패키지 테스트",
    sources: [
      {
        id: "source-1",
        fileName: "plan.png",
        mimeType: "image/png",
        assetId: "asset-1",
        widthPx: 100,
        heightPx: 100,
        opacity: 0.5,
        visible: true,
        locked: true,
        transform: { x: 0, y: 0, rotation: 0, scaleMmPerPixel: 10 },
        adjustments: {
          brightness: 0,
          contrast: 0,
          threshold: null,
          grayscale: false,
        },
        calibrationAnchors: [],
      },
    ],
    assets: [
      {
        id: "asset-1",
        kind: "floorplan",
        fileName: "plan.png",
        mimeType: "image/png",
        size: 4,
        createdAt: timestamp,
      },
    ],
    structureRevisions: [
      {
        id: "revision-1",
        name: "구조",
        origin: "manual",
        structure,
        createdAt: timestamp,
      },
    ],
    activeStructureRevisionId: "revision-1",
    scenarios: [
      {
        id: "scenario-1",
        name: "배치",
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

describe("project package", () => {
  it("round-trips project JSON and binary assets", async () => {
    const project = packageProject();
    const bytes = await createProjectPackage(project, async (assetId) =>
      assetId === "asset-1" ? new Uint8Array([1, 2, 3, 4]) : null
    );
    const imported = await readProjectPackage(bytes);
    expect(imported.project).toEqual(project);
    expect([...imported.assets.get("asset-1")!]).toEqual([1, 2, 3, 4]);
  });

  it("rejects packages missing a registered asset", async () => {
    const project = packageProject();
    await expect(createProjectPackage(project, async () => null)).rejects.toThrow(
      "미디어"
    );
  });
});
