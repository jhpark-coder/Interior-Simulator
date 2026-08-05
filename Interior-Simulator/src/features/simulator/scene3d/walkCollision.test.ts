import { describe, expect, it } from "vitest";
import {
  createRectangleStructure,
  createThreeRoomStructureFixture,
} from "../domain/structure";
import {
  canWalkBetween,
  findWalkLookTarget,
  findWalkStartPosition,
  isWalkPositionValid,
} from "./walkCollision";

describe("first-person collision", () => {
  it("accepts a point inside a room and rejects outside", () => {
    const structure = createThreeRoomStructureFixture();
    expect(isWalkPositionValid({ x: 1200, y: 1200 }, structure)).toBe(true);
    expect(isWalkPositionValid({ x: -500, y: 1200 }, structure)).toBe(false);
  });

  it("blocks walking through a solid internal wall", () => {
    const structure = createThreeRoomStructureFixture();
    expect(
      canWalkBetween(
        { x: 2500, y: 1800 },
        { x: 3500, y: 1800 },
        structure
      )
    ).toBe(false);
  });

  it("allows walking through a door opening", () => {
    const structure = createThreeRoomStructureFixture();
    structure.openings.push({
      id: "walk-door",
      kind: "door",
      wallId: "three-v1",
      offset: 1200,
      width: 1200,
      height: 2100,
      sillHeight: 0,
      source: { origin: "manual", confirmedByUser: true },
    });
    expect(
      canWalkBetween(
        { x: 2500, y: 1800 },
        { x: 3500, y: 1800 },
        structure
      )
    ).toBe(true);
  });

  it("finds a safe fallback when a room centroid lies on an internal wall", () => {
    const structure = createRectangleStructure({
      width: 5000,
      height: 4000,
      wallThickness: 200,
      ceilingHeight: 2400,
    });
    structure.walls.push({
      id: "center-wall",
      start: { x: 2500, y: 0 },
      end: { x: 2500, y: 4000 },
      thickness: 120,
      height: structure.ceilingHeight,
      kind: "interior",
      source: { origin: "manual", confirmedByUser: true },
    });

    const start = findWalkStartPosition(structure);
    expect(start).not.toBeNull();
    expect(isWalkPositionValid(start!, structure)).toBe(true);
    expect(
      canWalkBetween(start!, findWalkLookTarget(start!, structure), structure)
    ).toBe(true);
  });
});
