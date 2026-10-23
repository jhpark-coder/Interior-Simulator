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

  it("does not invent values for non-numeric fields", () => {
    const broken = project() as unknown as { structureRevisions: Array<{ structure: { walls: Array<Record<string, unknown>> } }> };
    broken.structureRevisions[0].structure.walls[0].thickness = null;
    expect(validateInteriorProject(repairProjectRanges(broken)).success).toBe(false);
  });
});
