import { detectRoomRegions } from "./geometry";
import type { FloorStructure, Vec2, Wall, WallKind } from "./types";

function createFixtureWall(
  id: string,
  start: Vec2,
  end: Vec2,
  kind: WallKind = "exterior"
): Wall {
  return {
    id,
    start,
    end,
    thickness: kind === "exterior" ? 200 : 120,
    height: 2400,
    kind,
    source: {
      origin: "manual",
      confirmedByUser: true,
    },
  };
}

function buildFixture(id: string, name: string, walls: Wall[]): FloorStructure {
  return {
    id,
    name,
    elevation: 0,
    ceilingHeight: 2400,
    walls,
    rooms: detectRoomRegions(walls, {
      idFactory: (() => {
        let index = 0;
        return () => `${id}-room-${(index += 1)}`;
      })(),
    }),
    openings: [],
  };
}

export type RectangleStructureOptions = {
  id?: string;
  name?: string;
  width: number;
  height: number;
  wallThickness: number;
  ceilingHeight: number;
  wallColor?: string;
  floorColor?: string;
};

export function createRectangleStructure({
  id = "floor-main",
  name = "1층",
  width,
  height,
  wallThickness,
  ceilingHeight,
  wallColor,
  floorColor,
}: RectangleStructureOptions): FloorStructure {
  const source = { origin: "default" as const, confirmedByUser: false };
  const wall = (
    wallId: string,
    start: Vec2,
    end: Vec2
  ): Wall => ({
    id: `${id}-${wallId}`,
    start,
    end,
    thickness: wallThickness,
    height: ceilingHeight,
    kind: "exterior",
    color: wallColor,
    source: { ...source },
  });
  const walls = [
    wall("north", { x: 0, y: 0 }, { x: width, y: 0 }),
    wall("east", { x: width, y: 0 }, { x: width, y: height }),
    wall("south", { x: width, y: height }, { x: 0, y: height }),
    wall("west", { x: 0, y: height }, { x: 0, y: 0 }),
  ];
  return {
    id,
    name,
    elevation: 0,
    ceilingHeight,
    walls,
    rooms: [
      {
        id: `${id}-room-1`,
        name: "방 1",
        polygon: [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ],
        wallIds: walls.map((item) => item.id),
        usage: "other",
        floorColor,
        source: { ...source },
      },
    ],
    openings: [],
  };
}

export function createRectangularStructureFixture(): FloorStructure {
  return buildFixture("fixture-rect", "직사각형 원룸", [
    createFixtureWall("rect-north", { x: 0, y: 0 }, { x: 5000, y: 0 }),
    createFixtureWall("rect-east", { x: 5000, y: 0 }, { x: 5000, y: 4000 }),
    createFixtureWall("rect-south", { x: 5000, y: 4000 }, { x: 0, y: 4000 }),
    createFixtureWall("rect-west", { x: 0, y: 4000 }, { x: 0, y: 0 }),
  ]);
}

export function createLShapedStructureFixture(): FloorStructure {
  return buildFixture("fixture-l", "L자형 공간", [
    createFixtureWall("l-1", { x: 0, y: 0 }, { x: 6000, y: 0 }),
    createFixtureWall("l-2", { x: 6000, y: 0 }, { x: 6000, y: 2500 }),
    createFixtureWall("l-3", { x: 6000, y: 2500 }, { x: 3500, y: 2500 }),
    createFixtureWall("l-4", { x: 3500, y: 2500 }, { x: 3500, y: 5000 }),
    createFixtureWall("l-5", { x: 3500, y: 5000 }, { x: 0, y: 5000 }),
    createFixtureWall("l-6", { x: 0, y: 5000 }, { x: 0, y: 0 }),
  ]);
}

export function createThreeRoomStructureFixture(): FloorStructure {
  return buildFixture("fixture-three-room", "복도 포함 방 3개", [
    createFixtureWall("three-north-1", { x: 0, y: 0 }, { x: 3000, y: 0 }),
    createFixtureWall("three-north-2", { x: 3000, y: 0 }, { x: 6000, y: 0 }),
    createFixtureWall("three-north-3", { x: 6000, y: 0 }, { x: 9000, y: 0 }),
    createFixtureWall("three-east-1", { x: 9000, y: 0 }, { x: 9000, y: 4500 }),
    createFixtureWall("three-east-2", { x: 9000, y: 4500 }, { x: 9000, y: 6500 }),
    createFixtureWall("three-south", { x: 9000, y: 6500 }, { x: 0, y: 6500 }),
    createFixtureWall("three-west-1", { x: 0, y: 6500 }, { x: 0, y: 4500 }),
    createFixtureWall("three-west-2", { x: 0, y: 4500 }, { x: 0, y: 0 }),
    createFixtureWall("three-v1", { x: 3000, y: 0 }, { x: 3000, y: 4500 }, "interior"),
    createFixtureWall("three-v2", { x: 6000, y: 0 }, { x: 6000, y: 4500 }, "interior"),
    createFixtureWall("three-hall-1", { x: 0, y: 4500 }, { x: 3000, y: 4500 }, "interior"),
    createFixtureWall(
      "three-hall-2",
      { x: 3000, y: 4500 },
      { x: 6000, y: 4500 },
      "interior"
    ),
    createFixtureWall(
      "three-hall-3",
      { x: 6000, y: 4500 },
      { x: 9000, y: 4500 },
      "interior"
    ),
  ]);
}
