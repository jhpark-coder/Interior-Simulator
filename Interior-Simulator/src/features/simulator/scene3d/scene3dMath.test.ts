import { describe, expect, it } from "vitest";
import type { Door, FurnitureItem, Room, Window } from "../types";
import {
  checkDoorFurnitureCollision,
  getDoorSwingPlacement,
  getRoomBaseboardSegments,
  getRoomWallSegments,
  getSceneCameraConfig,
  getSlidingDoorPlacement,
  getWindowPlacement,
  getWindowSlideTargets,
  interpolateAnimatedValue,
} from "./scene3dMath";

const room: Room = {
  width: 4000,
  height: 3000,
  wallThickness: 200,
  ceilingHeight: 2400,
  gridSize: 100,
  snapEnabled: true,
  displayUnit: "mm",
};

function createFurniture(
  overrides: Partial<FurnitureItem> = {}
): FurnitureItem {
  return {
    id: "furniture-1",
    type: "desk",
    category: "furniture",
    name: "Desk",
    x: 0,
    y: 0,
    width: 400,
    depth: 400,
    height: 720,
    rotation: 0,
    zIndex: 0,
    locked: false,
    ...overrides,
  };
}

describe("scene3d math utilities", () => {
  it("builds wall segments around door and window openings", () => {
    const door: Door = {
      id: "door-1",
      wall: "north",
      offset: 1000,
      width: 900,
      height: 2100,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };
    const window: Window = {
      id: "window-1",
      wall: "east",
      offset: 400,
      width: 1200,
      height: 1000,
      sillHeight: 900,
    };

    const segments = getRoomWallSegments(room, [door], [window]);

    expect(segments).toHaveLength(9);
    expect(segments).toContainEqual({
      key: "north-top-0",
      position: [1450, 2250, -100],
      size: [900, 300, 200],
    });
    expect(segments).toContainEqual({
      key: "east-bottom-0",
      position: [4100, 450, 1000],
      size: [200, 900, 1200],
    });
  });

  it("builds baseboards that skip door openings", () => {
    const door: Door = {
      id: "door-baseboard",
      wall: "north",
      offset: 1000,
      width: 900,
      height: 2100,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };

    const segments = getRoomBaseboardSegments(room, [door], []);

    expect(segments).toHaveLength(5);
    expect(segments).toContainEqual({
      key: "north-baseboard-before-0",
      position: [500, 45, -100],
      size: [1000, 90, 18],
    });
    expect(segments).toContainEqual({
      key: "north-baseboard-after",
      position: [2950, 45, -100],
      size: [2100, 90, 18],
    });
  });

  it("derives swing-door placement from wall orientation", () => {
    const door: Door = {
      id: "door-2",
      wall: "east",
      offset: 500,
      width: 900,
      height: 2100,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };

    expect(getDoorSwingPlacement(door, room)).toEqual({
      hingePosition: [4000 + 100, 1050, 1400],
      baseRotation: Math.PI / 2,
      zOffset: 100,
      hingeDir: 1,
      maxOpenAngle: Math.PI / 2,
    });
  });

  it("detects furniture blocking the door sweep", () => {
    const door: Door = {
      id: "door-3",
      wall: "north",
      offset: 1000,
      width: 900,
      height: 2100,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };
    const swingPlacement = getDoorSwingPlacement(door, room);
    const blockingFurniture = createFurniture({
      x: 1150,
      y: 0,
      width: 300,
      depth: 300,
    });
    const clearFurniture = createFurniture({
      id: "furniture-2",
      x: 2500,
      y: 2000,
    });

    expect(
      checkDoorFurnitureCollision({
        angle: 0,
        hingeX: swingPlacement.hingePosition[0],
        hingeZ: swingPlacement.hingePosition[2],
        baseRotation: swingPlacement.baseRotation,
        doorWidth: door.width,
        hingeDir: swingPlacement.hingeDir,
        zOffset: swingPlacement.zOffset,
        doorHalfThickness: door.thickness / 2,
        furniture: [blockingFurniture],
      })
    ).toBe(true);

    expect(
      checkDoorFurnitureCollision({
        angle: 0,
        hingeX: swingPlacement.hingePosition[0],
        hingeZ: swingPlacement.hingePosition[2],
        baseRotation: swingPlacement.baseRotation,
        doorWidth: door.width,
        hingeDir: swingPlacement.hingeDir,
        zOffset: swingPlacement.zOffset,
        doorHalfThickness: door.thickness / 2,
        furniture: [clearFurniture],
      })
    ).toBe(false);
  });

  it("returns wall-aligned window transforms and slide targets", () => {
    const window: Window = {
      id: "window-2",
      wall: "west",
      offset: 500,
      width: 1200,
      height: 1000,
      sillHeight: 900,
    };

    expect(getWindowPlacement(window, room)).toEqual({
      position: [-100, 1400, 1100],
      rotation: [0, -Math.PI / 2, 0],
    });
    expect(getWindowSlideTargets("left", 570)).toEqual({
      leftTarget: 570,
      rightTarget: 0,
    });
    expect(getWindowSlideTargets("right", 570)).toEqual({
      leftTarget: 0,
      rightTarget: -570,
    });
  });

  it("returns north-wall sliding door position and zero rotation", () => {
    const door: Door = {
      id: "sliding-north",
      wall: "north",
      offset: 500,
      width: 900,
      height: 2100,
      doorType: "sliding",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };
    const placement = getSlidingDoorPlacement(door, room);
    // along = offset + width/2 = 500 + 450 = 950, y = height/2 = 1050
    // north: position = [along, y, -wallThickness/2] = [950, 1050, -100]
    expect(placement.position).toEqual([950, 1050, -100]);
    expect(placement.rotationY).toBe(0);
  });

  it("returns east-wall sliding door position and PI/2 rotation", () => {
    const door: Door = {
      id: "sliding-east",
      wall: "east",
      offset: 800,
      width: 900,
      height: 2100,
      doorType: "sliding",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };
    const placement = getSlidingDoorPlacement(door, room);
    // along = 800 + 450 = 1250, y = 1050
    // east: position = [width + wallThickness/2, y, along] = [4100, 1050, 1250]
    expect(placement.position).toEqual([4100, 1050, 1250]);
    expect(placement.rotationY).toBeCloseTo(Math.PI / 2);
  });

  it("centers sliding door at wall midpoint when offset places it there", () => {
    const door: Door = {
      id: "sliding-center",
      wall: "north",
      offset: 1550, // (4000 - 900) / 2 = 1550 → center of north wall
      width: 900,
      height: 2100,
      doorType: "sliding",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };
    const placement = getSlidingDoorPlacement(door, room);
    // along = 1550 + 450 = 2000 = room.width / 2
    expect(placement.position[0]).toBe(2000);
  });

  it("snaps animated values once they are close enough to the target", () => {
    expect(interpolateAnimatedValue(0, 10, 0.1, 0.5)).toBe(1);
    expect(interpolateAnimatedValue(9.8, 10, 0.1, 0.5)).toBe(10);
  });

  it("derives a room-sized camera rig and lighting config", () => {
    expect(getSceneCameraConfig(room)).toEqual({
      position: [5600, 2600, 4400],
      target: [2000, 1008, 1500],
      keyLightPosition: [640, 3240, 240],
      fillLightPosition: [3520, 1872, 2760],
      contactShadowScale: [4480, expect.closeTo(3360, 5)],
      minDistance: 1800,
      maxDistance: 15500,
      near: 10,
      far: 25000,
      fov: 42,
    });
  });
});
