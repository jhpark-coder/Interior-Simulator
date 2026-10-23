import { describe, expect, it } from "vitest";
import {
  createRectangularStructureFixture,
  createThreeRoomStructureFixture,
} from "../domain/structure";
import type { FurnitureItem } from "../types";
import { findNarrowWalkways } from "./walkway";

function box(id: string, x: number, y: number, extra: Partial<FurnitureItem> = {}): FurnitureItem {
  return {
    id,
    type: "table",
    category: "furniture",
    name: id,
    x,
    y,
    width: 600,
    depth: 600,
    height: 720,
    rotation: 0,
    zIndex: 0,
    locked: false,
    ...extra,
  };
}

// 5000x4000 방, 외벽 두께 200 → 안쪽 벽면은 x=100..4900, y=100..3900.
const room = createRectangularStructureFixture();

describe("findNarrowWalkways", () => {
  it("marks a gap under 600mm between two pieces as blocked", () => {
    const gaps = findNarrowWalkways([box("a", 1500, 1500), box("b", 2600, 1500)], room);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].severity).toBe("blocked");
    expect(gaps[0].width).toBeCloseTo(500);
    expect(gaps[0].furnitureIds).toEqual(["a", "b"]);
    expect(gaps[0].from.x).toBeCloseTo(2100);
    expect(gaps[0].to.x).toBeCloseTo(2600);
  });

  it("marks a gap from 600mm to under 900mm as narrow", () => {
    const gaps = findNarrowWalkways([box("a", 1500, 1500), box("b", 2900, 1500)], room);
    expect(gaps.map((gap) => [gap.severity, Math.round(gap.width)])).toEqual([["narrow", 800]]);
  });

  it("ignores comfortable gaps and pieces pushed together", () => {
    expect(findNarrowWalkways([box("a", 1500, 1500), box("b", 3100, 1500)], room)).toEqual([]);
    expect(findNarrowWalkways([box("a", 1500, 1500), box("b", 2150, 1500)], room)).toEqual([]);
  });

  it("measures furniture to the wall face, not the wall centerline", () => {
    const gaps = findNarrowWalkways([box("a", 400, 1500)], room);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].severity).toBe("blocked");
    expect(gaps[0].width).toBeCloseTo(300);
    expect(gaps[0].from.x).toBeCloseTo(400);
    expect(gaps[0].to.x).toBeCloseTo(100);
    expect(gaps[0].furnitureIds).toEqual(["a"]);
  });

  it("does not measure diagonally to a corner where walls meet", () => {
    // three-east-2는 (9000,4500)에서 시작해 three-east-1·three-hall-3와 만난다. 가구 오른쪽 아래
    // 모서리에서 이 접합점까지의 대각선(약 347mm)은 복도 벽면까지의 340mm와 겹치는 측정이다.
    const gaps = findNarrowWalkways([box("a", 8200, 3500)], createThreeRoomStructureFixture());
    expect(gaps.map((gap) => Math.round(gap.width))).toEqual([340]);
    expect(gaps[0].to.y).toBeCloseTo(4440);
  });

  it("measures to the free end of a wall like a door jamb", () => {
    const structure = createRectangularStructureFixture();
    // 북쪽 벽에서 아래로 1500mm 내려온 두께 100 칸막이. 끝(2500,1500)은 다른 벽과 만나지 않는다.
    structure.walls.push({
      ...structure.walls[0],
      id: "stub",
      kind: "partition",
      start: { x: 2500, y: 0 },
      end: { x: 2500, y: 1500 },
      thickness: 100,
    });
    const gaps = findNarrowWalkways([box("a", 2200, 1800)], structure);
    expect(gaps.map((gap) => Math.round(gap.width))).toEqual([250]);
  });

  it("does not treat furniture on opposite sides of a wall as a walkway", () => {
    // 내벽 three-v1은 x=3000, 두께 120 → 벽면 2940/3060. 두 가구는 벽면에서 140mm(붙임) 떨어져 있다.
    const gaps = findNarrowWalkways(
      [box("a", 2200, 1500), box("b", 3200, 1500)],
      createThreeRoomStructureFixture()
    );
    expect(gaps).toEqual([]);
  });

  it("skips items attached to other furniture", () => {
    const gaps = findNarrowWalkways(
      [
        box("desk", 1500, 1500, { type: "desk", width: 1200 }),
        box("stand", 3000, 1500, { type: "monitor-stand", parentId: "desk" }),
      ],
      room
    );
    expect(gaps).toEqual([]);
  });

  it("uses the rotated footprint", () => {
    // 1600x400 가구를 90° 돌리면 가로 400만 차지한다(중심 x=2300 → 2100..2500).
    const rotated = box("b", 1500, 1600, { width: 1600, depth: 400, rotation: 90 });
    const gaps = findNarrowWalkways([box("a", 1000, 1800), rotated], room);
    expect(gaps.map((gap) => Math.round(gap.width))).toEqual([500]);
  });
});
