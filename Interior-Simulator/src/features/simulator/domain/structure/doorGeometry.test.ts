import { describe, expect, it } from "vitest";
import { migrateLegacyLayoutToStructure } from "../../store/migrations/layoutV1ToProjectV2";
import { LEGACY_LAYOUT_V120_FIXTURE } from "../../testFixtures/legacyLayout";
import type { Door, WallSide } from "../../types";
import { getDoorArcPoints, getOpeningPosition } from "../../utils/openings";
import {
  doorLeafDirection,
  doorSwingArc,
  doorSwingGeometry,
  inwardNormal,
  resolvedDoorDetails,
  slidingDoorDirection,
} from "./doorGeometry";
import { createRectangleStructure } from "./fixtures";
import type { FloorStructure, Opening, Wall } from "./types";

function legacyDoor(overrides: Partial<Door>): Door {
  return {
    id: "legacy-door",
    wall: "north",
    offset: 1200,
    width: 900,
    height: 2100,
    doorType: "swing",
    hinge: "left",
    swing: "inward",
    slideDirection: "right",
    openAngle: 90,
    thickness: 40,
    ...overrides,
  };
}

function angleVector(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

function expectVectorClose(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

function opening(overrides: Partial<Opening> = {}): Opening {
  return {
    id: "door",
    kind: "door",
    wallId: "wall",
    offset: 1000,
    width: 900,
    height: 2100,
    sillHeight: 0,
    source: { origin: "manual", confirmedByUser: true },
    ...overrides,
  };
}

describe("doorSwingGeometry matches the legacy single-room door drawing", () => {
  const sides: WallSide[] = ["north", "east", "south", "west"];
  const cases = sides.flatMap((wall) =>
    (["left", "right"] as const).flatMap((hinge) =>
      (["inward", "outward"] as const).flatMap((swing) =>
        [60, 90].map((openAngle) => ({ wall, hinge, swing, openAngle }))
      )
    )
  );

  it.each(cases)("$wall wall, $hinge hinge, $swing, $openAngle°", (variant) => {
    const door = legacyDoor(variant);
    const layout = { ...LEGACY_LAYOUT_V120_FIXTURE, doors: [door], windows: [] };
    const structure = migrateLegacyLayoutToStructure(layout);
    const migrated = structure.openings[0];
    const wall = structure.walls.find((item) => item.id === migrated.wallId)!;

    const legacy = getDoorArcPoints(door, layout.room);
    const origin = getOpeningPosition(door.wall, door.offset, layout.room);
    const geometry = doorSwingGeometry(migrated, wall, structure);

    expectVectorClose(geometry.hinge, {
      x: origin.x + legacy.hingeX,
      y: origin.y + legacy.hingeY,
    });
    expectVectorClose(geometry.closedDirection, angleVector(legacy.closedAngle));
    expectVectorClose(
      doorLeafDirection(geometry, geometry.openAngle),
      angleVector(legacy.openAngle)
    );
    expect(geometry.radius).toBe(door.width);
  });
});

describe("inwardNormal", () => {
  const rectangle = createRectangleStructure({
    width: 4000,
    height: 3000,
    wallThickness: 200,
    ceilingHeight: 2400,
  });

  it("points into the room for every exterior wall regardless of wall direction", () => {
    const expected: Record<string, { x: number; y: number }> = {
      "floor-main-north": { x: 0, y: 1 },
      "floor-main-east": { x: -1, y: 0 },
      "floor-main-south": { x: 0, y: -1 },
      "floor-main-west": { x: 1, y: 0 },
    };
    for (const wall of rectangle.walls) {
      const normal = inwardNormal(opening({ wallId: wall.id }), wall, rectangle);
      expectVectorClose(normal, expected[wall.id]);
    }
  });

  it("falls back to the wall's left normal when both sides are rooms", () => {
    const partition: Wall = {
      id: "partition",
      start: { x: 2000, y: 0 },
      end: { x: 2000, y: 3000 },
      thickness: 120,
      height: 2400,
      kind: "interior",
      source: { origin: "manual", confirmedByUser: true },
    };
    const structure: FloorStructure = {
      ...rectangle,
      walls: [...rectangle.walls, partition],
      rooms: [
        { ...rectangle.rooms[0], id: "west-room", polygon: [
          { x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 },
        ] },
        { ...rectangle.rooms[0], id: "east-room", polygon: [
          { x: 2000, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 2000, y: 3000 },
        ] },
      ],
    };
    // 시작→끝이 +y이므로 왼쪽 법선은 -x다.
    expectVectorClose(inwardNormal(opening({ wallId: "partition" }), partition, structure), {
      x: -1,
      y: 0,
    });
  });

  it("falls back to the left normal when no rooms are computed", () => {
    const wall = rectangle.walls[0];
    const structure = { ...rectangle, rooms: [] };
    expectVectorClose(inwardNormal(opening({ wallId: wall.id }), wall, structure), {
      x: 0,
      y: 1,
    });
  });
});

describe("door details and helpers", () => {
  const structure = createRectangleStructure({
    width: 4000,
    height: 3000,
    wallThickness: 200,
    ceilingHeight: 2400,
  });
  const north = structure.walls[0];

  it("fills defaults for doors created without details and clamps the angle", () => {
    expect(resolvedDoorDetails(opening())).toEqual({
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    });
    expect(resolvedDoorDetails(opening({ openAngle: 400 })).openAngle).toBe(180);
    expect(resolvedDoorDetails(opening({ openAngle: -20 })).openAngle).toBe(0);
  });

  it("builds an arc from the closed leaf to the open leaf", () => {
    const door = opening({ wallId: north.id, offset: 1000, width: 900, openAngle: 90 });
    const geometry = doorSwingGeometry(door, north, structure);
    const arc = doorSwingArc(geometry, 12);
    expect(arc).toHaveLength(13);
    expectVectorClose(arc[0], { x: 1900, y: 0 });
    // 안쪽(+y)으로 90° 연 문짝 끝
    expectVectorClose(arc[12], { x: 1000, y: 900 });
  });

  it("opens a right-hinged outward door from the far end toward the outside", () => {
    const door = opening({ wallId: north.id, hinge: "right", swing: "outward", openAngle: 90 });
    const geometry = doorSwingGeometry(door, north, structure);
    expectVectorClose(geometry.hinge, { x: 1900, y: 0 });
    expectVectorClose(doorLeafDirection(geometry, 90), { x: 0, y: -1 });
  });

  it("slides toward the wall start for 'left' and toward the end for 'right'", () => {
    expectVectorClose(slidingDoorDirection(opening({ slideDirection: "left" }), north), {
      x: -1,
      y: 0,
    });
    expectVectorClose(slidingDoorDirection(opening({ slideDirection: "right" }), north), {
      x: 1,
      y: 0,
    });
  });
});
