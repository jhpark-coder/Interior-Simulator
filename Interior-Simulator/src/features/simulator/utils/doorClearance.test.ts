import { describe, expect, it } from "vitest";
import {
  createRectangularStructureFixture,
  type FloorStructure,
  type Opening,
} from "../domain/structure";
import type { FurnitureItem } from "../types";
import { doorClearances } from "./doorClearance";

// 5000×4000 직사각형 방. 북쪽 벽(두께 200)은 (0,0)→(5000,0)이고 방은 +y 쪽이다.
function structureWithDoor(door: Partial<Opening> = {}): FloorStructure {
  const structure = createRectangularStructureFixture();
  return {
    ...structure,
    openings: [
      {
        id: "door",
        kind: "door",
        wallId: "rect-north",
        offset: 1000,
        width: 900,
        height: 2100,
        sillHeight: 0,
        doorType: "swing",
        hinge: "left",
        swing: "inward",
        openAngle: 90,
        thickness: 40,
        source: { origin: "manual", confirmedByUser: true },
        ...door,
      },
    ],
  };
}

function box(id: string, x: number, y: number, width: number, depth: number): FurnitureItem {
  return {
    id,
    type: "custom",
    category: "furniture",
    name: id,
    x,
    y,
    width,
    depth,
    height: 700,
    rotation: 0,
    zIndex: 0,
    locked: false,
  };
}

describe("doorClearances for swing doors", () => {
  it("opens fully with no furniture in the swing", () => {
    expect(doorClearances(structureWithDoor(), [box("far", 3000, 3000, 500, 500)])).toEqual([
      {
        openingId: "door",
        doorType: "swing",
        clearFraction: 1,
        clearAngle: 90,
        blockingFurnitureIds: [],
      },
    ]);
  });

  it("stops before an item inside the swing and reports it", () => {
    // 경첩 (1000, 0)에서 45° 방향 700mm 지점을 중심으로 한 200mm 상자
    const [door] = doorClearances(structureWithDoor(), [
      box("stool", 1395, 395, 200, 200),
    ]);
    expect(door.blockingFurnitureIds).toEqual(["stool"]);
    expect(door.clearAngle).toBeGreaterThan(20);
    expect(door.clearAngle).toBeLessThan(45);
    expect(door.clearFraction).toBeCloseTo(door.clearAngle! / 90, 9);
  });

  it("ignores items just beyond the leaf length", () => {
    // 45° 방향 1100mm 지점(문 폭 900mm 바깥)
    const [door] = doorClearances(structureWithDoor(), [box("shelf", 1728, 728, 100, 100)]);
    expect(door.blockingFurnitureIds).toEqual([]);
    expect(door.clearFraction).toBe(1);
  });

  it("does not report items on the other side when the door swings outward", () => {
    const [door] = doorClearances(structureWithDoor({ swing: "outward" }), [
      box("stool", 1395, 395, 200, 200),
    ]);
    expect(door.blockingFurnitureIds).toEqual([]);
  });

  it("catches a long item whose corners are all outside the swing radius", () => {
    // 양 끝 모서리는 경첩에서 900mm보다 멀지만 가운데가 문 앞을 지난다.
    const [door] = doorClearances(structureWithDoor(), [box("sofa", 0, 500, 3000, 100)]);
    expect(door.blockingFurnitureIds).toEqual(["sofa"]);
    expect(door.clearAngle).toBeLessThan(40);
  });

  it("reports a closed position collision as zero clearance", () => {
    // 벽 안까지 들어온 가구(정상 배치로는 생기지 않지만 구형 데이터 등)는 닫힌 문짝과도 닿는다.
    const [door] = doorClearances(structureWithDoor(), [box("bin", 1300, -10, 200, 300)]);
    expect(door.blockingFurnitureIds).toEqual(["bin"]);
    expect(door.clearFraction).toBe(0);
    expect(door.clearAngle).toBe(0);
  });
});

describe("doorClearances for sliding doors", () => {
  // 미닫이 문짝은 방 쪽 벽면(y = 100 + 4 + 20)에 붙어 x 방향으로 810mm 움직인다.
  const cabinet = box("cabinet", 1950, 100, 600, 600);

  it("stops at furniture placed against the wall in the slide path", () => {
    const [door] = doorClearances(
      structureWithDoor({ doorType: "sliding", slideDirection: "right" }),
      [cabinet]
    );
    expect(door.doorType).toBe("sliding");
    expect(door.clearAngle).toBeNull();
    expect(door.blockingFurnitureIds).toEqual(["cabinet"]);
    expect(door.clearFraction).toBeGreaterThan(0);
    expect(door.clearFraction).toBeLessThan(0.1);
  });

  it("is clear when sliding away from the furniture", () => {
    const [door] = doorClearances(
      structureWithDoor({ doorType: "sliding", slideDirection: "left" }),
      [cabinet]
    );
    expect(door.blockingFurnitureIds).toEqual([]);
    expect(door.clearFraction).toBe(1);
  });
});

it("skips windows and passages", () => {
  const structure = structureWithDoor({ kind: "window" });
  expect(doorClearances(structure, [box("stool", 1395, 395, 200, 200)])).toEqual([]);
});
