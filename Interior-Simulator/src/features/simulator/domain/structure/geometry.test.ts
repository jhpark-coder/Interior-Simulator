import { describe, expect, it } from "vitest";
import {
  detectRoomRegions,
  distance,
  moveConnectedWallEndpoint,
  pointAlongWall,
  polygonArea,
  projectPointToWall,
  segmentIntersection,
  splitWallAtPoint,
  validateStructure,
  wallLength,
} from "./geometry";
import {
  createLShapedStructureFixture,
  createRectangularStructureFixture,
  createThreeRoomStructureFixture,
} from "./fixtures";

describe("structure geometry", () => {
  it("calculates wall length, projection and wall offset", () => {
    const wall = {
      start: { x: 100, y: 200 },
      end: { x: 1100, y: 200 },
    };
    expect(wallLength(wall)).toBe(1000);
    expect(projectPointToWall({ x: 400, y: 500 }, wall)).toEqual({
      point: { x: 400, y: 200 },
      distance: 300,
      offset: 300,
      t: 0.3,
    });
    expect(pointAlongWall(wall, 750)).toEqual({ x: 850, y: 200 });
  });

  it("finds a proper segment intersection", () => {
    const intersection = segmentIntersection(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 100, y: 0 }
    );
    expect(intersection?.point).toEqual({ x: 50, y: 50 });
    expect(intersection?.proper).toBe(true);
  });

  it("moves every endpoint connected to the edited endpoint", () => {
    const structure = createRectangularStructureFixture();
    const moved = moveConnectedWallEndpoint(
      structure.walls,
      "rect-north",
      "end",
      { x: 5500, y: 100 }
    );
    const north = moved.find((wall) => wall.id === "rect-north")!;
    const east = moved.find((wall) => wall.id === "rect-east")!;
    expect(north.end).toEqual({ x: 5500, y: 100 });
    expect(east.start).toEqual({ x: 5500, y: 100 });
    expect(distance(north.end, east.start)).toBe(0);
  });

  it("splits a wall while preserving its properties", () => {
    const wall = createRectangularStructureFixture().walls[0];
    let sequence = 0;
    const split = splitWallAtPoint(wall, { x: 2000, y: 300 }, () => {
      sequence += 1;
      return `split-${sequence}`;
    });
    expect(split).not.toBeNull();
    expect(split?.map((part) => wallLength(part))).toEqual([2000, 3000]);
    expect(split?.[0].end).toEqual(split?.[1].start);
    expect(split?.[0].kind).toBe(wall.kind);
  });

  it("detects one room in rectangle and L-shaped fixtures", () => {
    const rectangle = createRectangularStructureFixture();
    const lShape = createLShapedStructureFixture();
    expect(rectangle.rooms).toHaveLength(1);
    expect(polygonArea(rectangle.rooms[0].polygon)).toBe(20_000_000);
    expect(lShape.rooms).toHaveLength(1);
    expect(polygonArea(lShape.rooms[0].polygon)).toBe(23_750_000);
  });

  it("detects each bounded face in a multi-room wall graph", () => {
    const structure = createThreeRoomStructureFixture();
    const rooms = detectRoomRegions(structure.walls);
    expect(rooms).toHaveLength(4);
    expect(rooms.map((room) => polygonArea(room.polygon))).toEqual([
      13_500_000,
      13_500_000,
      13_500_000,
      18_000_000,
    ]);
  });

  it("reports crossing, dangling, and out-of-bounds opening issues", () => {
    const structure = createRectangularStructureFixture();
    structure.walls.push({
      ...structure.walls[0],
      id: "crossing",
      start: { x: 2500, y: -500 },
      end: { x: 2500, y: 500 },
    });
    structure.openings.push({
      id: "bad-opening",
      kind: "door",
      wallId: "rect-north",
      offset: 4800,
      width: 900,
      height: 2100,
      sillHeight: 0,
      source: { origin: "manual", confirmedByUser: true },
    });
    const codes = validateStructure(structure).map((issue) => issue.code);
    expect(codes).toContain("wall-crossing");
    expect(codes).toContain("dangling-endpoint");
    expect(codes).toContain("opening-out-of-bounds");
  });
});
