import { describe, expect, it } from "vitest";
import {
  createLShapedStructureFixture,
  createRectangularStructureFixture,
} from "../domain/structure";
import {
  buildStructureWallSegments,
  getOpeningMeshPlacement,
  getStructureBounds,
} from "./structure3dMath";

describe("structure3dMath", () => {
  it("calculates bounds for arbitrary wall graphs", () => {
    expect(getStructureBounds(createLShapedStructureFixture())).toEqual({
      minX: 0,
      minY: 0,
      maxX: 6000,
      maxY: 5000,
      width: 6000,
      height: 5000,
      centerX: 3000,
      centerY: 2500,
    });
  });

  it("creates one full-height mesh segment per wall without openings", () => {
    const structure = createRectangularStructureFixture();
    const segments = buildStructureWallSegments(structure);
    expect(segments).toHaveLength(4);
    expect(segments.every((segment) => segment.size[1] === 2400)).toBe(true);
  });

  it("segments a wall above and around a door opening", () => {
    const structure = createRectangularStructureFixture();
    structure.openings.push({
      id: "door-1",
      kind: "door",
      wallId: "rect-north",
      offset: 1000,
      width: 900,
      height: 2100,
      sillHeight: 0,
      source: { origin: "manual", confirmedByUser: true },
    });
    const north = buildStructureWallSegments(structure).filter(
      (segment) => segment.wallId === "rect-north"
    );
    expect(north.map((segment) => segment.size)).toEqual([
      [1000, 2400, 200],
      [900, 300, 200],
      [3100, 2400, 200],
    ]);
  });

  it("creates wall below and above a window", () => {
    const structure = createRectangularStructureFixture();
    structure.openings.push({
      id: "window-1",
      kind: "window",
      wallId: "rect-east",
      offset: 800,
      width: 1200,
      height: 1000,
      sillHeight: 900,
      source: { origin: "manual", confirmedByUser: true },
    });
    const east = buildStructureWallSegments(structure).filter(
      (segment) => segment.wallId === "rect-east"
    );
    expect(east.map((segment) => segment.size[1])).toEqual([
      2400,
      900,
      500,
      2400,
    ]);
    const wall = structure.walls.find((item) => item.id === "rect-east")!;
    expect(getOpeningMeshPlacement(structure.openings[0], wall).position).toEqual([
      5000,
      1400,
      1400,
    ]);
  });
});
