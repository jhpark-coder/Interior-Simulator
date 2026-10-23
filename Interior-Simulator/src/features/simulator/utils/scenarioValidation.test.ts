import { describe, expect, it } from "vitest";
import {
  createLShapedStructureFixture,
  createRectangularStructureFixture,
  createThreeRoomStructureFixture,
} from "../domain/structure";
import type { FurnitureItem } from "../types";
import { findMisplacedFurniture, validateFurnitureInStructure } from "./scenarioValidation";

function furniture(
  x: number,
  y: number,
  width = 800,
  depth = 600
): FurnitureItem {
  return {
    id: "test-item",
    type: "table",
    category: "furniture",
    name: "테이블",
    x,
    y,
    width,
    depth,
    height: 720,
    rotation: 0,
    zIndex: 0,
    locked: false,
  };
}

describe("scenario structure validation", () => {
  it("accepts furniture fully inside a room", () => {
    expect(
      validateFurnitureInStructure(
        furniture(1000, 1000),
        createRectangularStructureFixture()
      )
    ).toEqual({ valid: true });
  });

  it("rejects furniture outside an L-shaped floor", () => {
    expect(
      validateFurnitureInStructure(
        furniture(4500, 3500),
        createLShapedStructureFixture()
      ).reason
    ).toBe("outside-structure");
  });

  it("rejects furniture crossing an internal wall", () => {
    expect(
      validateFurnitureInStructure(
        furniture(2750, 1000, 600, 1000),
        createThreeRoomStructureFixture()
      ).reason
    ).toBe("crosses-wall");
  });

  it("allows furniture to span a sufficiently wide passage", () => {
    const structure = createThreeRoomStructureFixture();
    structure.openings.push({
      id: "passage-1",
      kind: "passage",
      wallId: "three-v1",
      offset: 1200,
      width: 1600,
      height: 2200,
      sillHeight: 0,
      source: { origin: "manual", confirmedByUser: true },
    });
    expect(
      validateFurnitureInStructure(
        furniture(2750, 1500, 600, 600),
        structure
      )
    ).toEqual({ valid: true });
  });
});

describe("findMisplacedFurniture", () => {
  it("lists only the items outside the structure or across a wall, with the reason", () => {
    // 방 3개 구조에는 x=3000(y 0~4500)의 내부 벽이 있다.
    const structure = createThreeRoomStructureFixture();
    const inside = { ...furniture(500, 500), id: "inside" };
    const outside = { ...furniture(-2000, 500), id: "outside" };
    const crossing = { ...furniture(2600, 500), id: "crossing" };
    expect(validateFurnitureInStructure(crossing, structure)).toEqual({
      valid: false,
      reason: "crosses-wall",
    });

    expect(findMisplacedFurniture([inside, outside, crossing], structure)).toEqual([
      { id: "outside", reason: "outside-structure" },
      { id: "crossing", reason: "crosses-wall" },
    ]);
  });

  it("treats every item as outside when the structure has no rooms", () => {
    const structure = { ...createRectangularStructureFixture(), rooms: [] };
    expect(findMisplacedFurniture([furniture(500, 500)], structure)).toEqual([
      { id: "test-item", reason: "outside-structure" },
    ]);
  });
});
