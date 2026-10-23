import { describe, expect, it } from "vitest";
import { createRectangleStructure } from "../structure";
import { repairProjectRanges } from "./repair";
import { validateInteriorProject } from "./schema";
import type { InteriorProject } from "./types";

function project(): InteriorProject {
  const structure = createRectangleStructure({
    width: 4000,
    height: 3000,
    wallThickness: 200,
    ceilingHeight: 2400,
  });
  structure.openings.push({
    id: "door",
    kind: "door",
    wallId: structure.walls[0].id,
    offset: 500,
    width: 900,
    height: 2100,
    sillHeight: 0,
    openAngle: 90,
    source: { origin: "manual", confirmedByUser: true },
  });
  const createdAt = "2026-10-23T00:00:00.000Z";
  return {
    version: "2.0.0",
    id: "project",
    name: "복구 테스트",
    sources: [],
    assets: [],
    structureRevisions: [
      { id: "revision", name: "기본", origin: "manual", structure, createdAt },
    ],
    activeStructureRevisionId: "revision",
    scenarios: [
      {
        id: "scenario",
        name: "현재 배치",
        structureRevisionId: "revision",
        furniture: [],
        materials: [],
        createdAt,
        updatedAt: createdAt,
      },
    ],
    activeScenarioId: "scenario",
    memoryPins: [],
    savedViewpoints: [],
    meta: { createdAt, updatedAt: createdAt },
  };
}

describe("repairProjectRanges", () => {
  it("clamps out-of-range values saved by older versions so the project validates again", () => {
    const broken = project();
    const structure = broken.structureRevisions[0].structure;
    structure.walls[0].thickness = 0;
    structure.walls[1].height = 50;
    structure.walls[2].thickness = 5000;
    structure.ceilingHeight = 500;
    Object.assign(structure.openings[0], { width: 0, height: -10, offset: -5, openAngle: 250 });
    expect(validateInteriorProject(broken).success).toBe(false);

    const repaired = repairProjectRanges(broken) as InteriorProject;
    expect(validateInteriorProject(repaired).success).toBe(true);
    const fixed = repaired.structureRevisions[0].structure;
    expect(fixed.walls[0].thickness).toBe(20);
    expect(fixed.walls[1].height).toBe(100);
    expect(fixed.walls[2].thickness).toBe(2000);
    expect(fixed.ceilingHeight).toBe(1000);
    expect(fixed.openings[0]).toMatchObject({ width: 100, height: 100, offset: 0, openAngle: 180 });

    // 원본은 바꾸지 않는다.
    expect(structure.walls[0].thickness).toBe(0);
  });

  it("leaves valid projects equal and non-projects untouched", () => {
    const valid = project();
    expect(repairProjectRanges(valid)).toEqual(valid);
    expect(repairProjectRanges(null)).toBeNull();
    expect(repairProjectRanges("x")).toBe("x");
  });

  it("fits a stored floor plan crop inside the image or drops it", () => {
    const createdAt = "2026-10-23T00:00:00.000Z";
    const withSource = (crop: { x: number; y: number; width: number; height: number }) => {
      const value = project();
      value.assets.push({
        id: "asset",
        kind: "floorplan",
        fileName: "plan.png",
        mimeType: "image/png",
        size: 10,
        createdAt,
      });
      value.sources.push({
        id: "source",
        fileName: "plan.png",
        mimeType: "image/png",
        assetId: "asset",
        widthPx: 1000,
        heightPx: 800,
        opacity: 0.5,
        visible: true,
        locked: false,
        transform: { x: 0, y: 0, rotation: 0, scaleMmPerPixel: null },
        adjustments: { brightness: 0, contrast: 0, threshold: null, grayscale: false },
        crop,
        calibrationAnchors: [],
      });
      return value;
    };

    const valid = withSource({ x: 100, y: 100, width: 500, height: 400 });
    expect(validateInteriorProject(valid).success).toBe(true);

    const overflowing = withSource({ x: 600, y: 100, width: 600, height: 400 });
    expect(validateInteriorProject(overflowing).success).toBe(false);
    const fitted = repairProjectRanges(overflowing) as InteriorProject;
    expect(validateInteriorProject(fitted).success).toBe(true);
    expect(fitted.sources[0].crop).toEqual({ x: 600, y: 100, width: 400, height: 400 });

    const outside = repairProjectRanges(withSource({ x: 2000, y: 0, width: 100, height: 100 })) as InteriorProject;
    expect(validateInteriorProject(outside).success).toBe(true);
    expect(outside.sources[0]).not.toHaveProperty("crop");
  });

  it("does not invent values for non-numeric fields", () => {
    const broken = project() as unknown as { structureRevisions: Array<{ structure: { walls: Array<Record<string, unknown>> } }> };
    broken.structureRevisions[0].structure.walls[0].thickness = null;
    expect(validateInteriorProject(repairProjectRanges(broken)).success).toBe(false);
  });
});
