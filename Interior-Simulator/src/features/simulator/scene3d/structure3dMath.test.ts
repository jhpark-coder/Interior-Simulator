import { describe, expect, it } from "vitest";
import { Euler, Object3D, Vector3 } from "three";
import { cameraDirectionVector } from "../domain/memory";
import {
  createLShapedStructureFixture,
  createRectangularStructureFixture,
  doorLeafDirection,
  doorSwingArc,
  doorSwingGeometry,
  type Opening,
} from "../domain/structure";
import {
  buildStructureWallSegments,
  directionToRotationY,
  getOpeningMeshPlacement,
  memoryPinConeTransform,
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

describe("directionToRotationY", () => {
  it.each([
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
  ])("turns local +X toward 2D direction (%o) as 3D (x, 0, y)", (direction) => {
    const local = new Vector3(1, 0, 0).applyEuler(
      new Euler(0, directionToRotationY(direction), 0)
    );
    expect(local.x).toBeCloseTo(direction.x, 9);
    expect(local.y).toBeCloseTo(0, 9);
    expect(local.z).toBeCloseTo(direction.y, 9);
  });

  it("puts an opened 3D door leaf where the 2D swing arc ends", () => {
    const structure = createRectangularStructureFixture();
    const wall = structure.walls[0];
    const door: Opening = {
      id: "door",
      kind: "door",
      wallId: wall.id,
      offset: 1000,
      width: 900,
      height: 2100,
      sillHeight: 0,
      openAngle: 75,
      source: { origin: "manual", confirmedByUser: true },
    };
    const geometry = doorSwingGeometry(door, wall, structure);
    const leafTip = new Vector3(geometry.radius, 0, 0)
      .applyEuler(new Euler(0, directionToRotationY(doorLeafDirection(geometry, 75)), 0))
      .add(new Vector3(geometry.hinge.x, 0, geometry.hinge.y));
    const arcEnd = doorSwingArc(geometry).at(-1)!;
    expect(leafTip.x).toBeCloseTo(arcEnd.x, 6);
    expect(leafTip.z).toBeCloseTo(arcEnd.y, 6);
  });
});

describe("memoryPinConeTransform", () => {
  it.each([0, 90, 180, 270, 45])("points the cone tip toward the %s° photo direction", (degrees) => {
    const direction = cameraDirectionVector(degrees);
    const transform = memoryPinConeTransform(direction);
    const group = new Object3D();
    group.rotation.set(0, transform.groupRotationY, 0);
    const cone = new Object3D();
    cone.position.set(...transform.position);
    cone.rotation.set(...transform.rotation);
    group.add(cone);
    group.updateMatrixWorld(true);
    // ConeGeometry의 끝은 로컬 +Y 방향 height/2 지점이다.
    const tip = cone.localToWorld(new Vector3(0, transform.length / 2, 0));
    const reach = transform.position[0] + transform.length / 2;
    expect(tip.x).toBeCloseTo(direction.x * reach, 6);
    expect(tip.y).toBeCloseTo(0, 6);
    expect(tip.z).toBeCloseTo(direction.y * reach, 6);
  });
});
