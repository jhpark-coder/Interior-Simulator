import type { Door, FurnitureItem, Room, WallSide, Window } from "../types";
import { getWallLength } from "../utils/openings";

export type Vector3Tuple = [number, number, number];
export type RotationTuple = [number, number, number];

export type WallSegment = {
  key: string;
  position: Vector3Tuple;
  size: Vector3Tuple;
};

export type SceneCameraConfig = {
  position: Vector3Tuple;
  target: Vector3Tuple;
  keyLightPosition: Vector3Tuple;
  fillLightPosition: Vector3Tuple;
  contactShadowScale: [number, number];
  minDistance: number;
  maxDistance: number;
  near: number;
  far: number;
  fov: number;
};

type OpeningSegment = {
  start: number;
  end: number;
  height: number;
  sillHeight: number;
};

type WallAlignedTransform = {
  position: Vector3Tuple;
  rotationY: number;
};

type DoorCollisionInput = {
  angle: number;
  hingeX: number;
  hingeZ: number;
  baseRotation: number;
  doorWidth: number;
  hingeDir: number;
  zOffset: number;
  doorHalfThickness: number;
  furniture: FurnitureItem[];
  margin?: number;
};

export type DoorSwingPlacement = {
  hingePosition: Vector3Tuple;
  baseRotation: number;
  zOffset: number;
  hingeDir: 1 | -1;
  maxOpenAngle: number;
};

const WALLS: WallSide[] = ["north", "south", "east", "west"];

function getWallAlignedTransform(
  room: Room,
  wall: WallSide,
  along: number,
  y: number
): WallAlignedTransform {
  switch (wall) {
    case "north":
      return {
        position: [along, y, -room.wallThickness / 2],
        rotationY: 0,
      };
    case "south":
      return {
        position: [along, y, room.height + room.wallThickness / 2],
        rotationY: Math.PI,
      };
    case "east":
      return {
        position: [room.width + room.wallThickness / 2, y, along],
        rotationY: Math.PI / 2,
      };
    case "west":
      return {
        position: [-room.wallThickness / 2, y, along],
        rotationY: -Math.PI / 2,
      };
  }
}

function getWallSegmentSize(
  room: Room,
  wall: WallSide,
  segmentLength: number,
  segmentHeight: number,
  thickness = room.wallThickness
): Vector3Tuple {
  const isHorizontal = wall === "north" || wall === "south";

  return isHorizontal
    ? [segmentLength, segmentHeight, thickness]
    : [thickness, segmentHeight, segmentLength];
}

function getWallOpenings(
  wall: WallSide,
  doors: Door[],
  windows: Window[]
): OpeningSegment[] {
  return [
    ...doors.filter((door) => door.wall === wall).map((door) => ({
      start: door.offset,
      end: door.offset + door.width,
      height: door.height,
      sillHeight: 0,
    })),
    ...windows.filter((window) => window.wall === wall).map((window) => ({
      start: window.offset,
      end: window.offset + window.width,
      height: window.height,
      sillHeight: window.sillHeight,
    })),
  ].sort((a, b) => a.start - b.start);
}

export function getRoomWallSegments(
  room: Room,
  doors: Door[],
  windows: Window[]
): WallSegment[] {
  const segments: WallSegment[] = [];

  WALLS.forEach((wall) => {
    const wallLength = getWallLength(wall, room);
    const openings = getWallOpenings(wall, doors, windows);
    let currentPos = 0;

    openings.forEach((opening, index) => {
      if (opening.start > currentPos) {
        const segmentLength = opening.start - currentPos;
        const segmentCenter = currentPos + segmentLength / 2;

        segments.push({
          key: `${wall}-before-${index}`,
          position: getWallAlignedTransform(
            room,
            wall,
            segmentCenter,
            room.ceilingHeight / 2
          ).position,
          size: getWallSegmentSize(room, wall, segmentLength, room.ceilingHeight),
        });
      }

      const openingLength = opening.end - opening.start;
      const openingCenter = (opening.start + opening.end) / 2;
      const topHeight =
        room.ceilingHeight - opening.height - opening.sillHeight;

      if (topHeight > 0) {
        segments.push({
          key: `${wall}-top-${index}`,
          position: getWallAlignedTransform(
            room,
            wall,
            openingCenter,
            opening.height + opening.sillHeight + topHeight / 2
          ).position,
          size: getWallSegmentSize(room, wall, openingLength, topHeight),
        });
      }

      if (opening.sillHeight > 0) {
        segments.push({
          key: `${wall}-bottom-${index}`,
          position: getWallAlignedTransform(
            room,
            wall,
            openingCenter,
            opening.sillHeight / 2
          ).position,
          size: getWallSegmentSize(room, wall, openingLength, opening.sillHeight),
        });
      }

      currentPos = opening.end;
    });

    if (currentPos < wallLength) {
      const segmentLength = wallLength - currentPos;
      const segmentCenter = currentPos + segmentLength / 2;

      segments.push({
        key: `${wall}-after`,
        position: getWallAlignedTransform(
          room,
          wall,
          segmentCenter,
          room.ceilingHeight / 2
        ).position,
        size: getWallSegmentSize(room, wall, segmentLength, room.ceilingHeight),
      });
    }
  });

  return segments;
}

export function getRoomBaseboardSegments(
  room: Room,
  doors: Door[],
  windows: Window[],
  baseboardHeight = 90,
  baseboardThickness = 18
): WallSegment[] {
  const segments: WallSegment[] = [];

  WALLS.forEach((wall) => {
    const wallLength = getWallLength(wall, room);
    const openings = [
      ...doors
        .filter((door) => door.wall === wall)
        .map((door) => ({
          start: door.offset,
          end: door.offset + door.width,
        })),
      ...windows
        .filter(
          (window) =>
            window.wall === wall && window.sillHeight <= baseboardHeight
        )
        .map((window) => ({
          start: window.offset,
          end: window.offset + window.width,
        })),
    ].sort((a, b) => a.start - b.start);

    let currentPos = 0;

    openings.forEach((opening, index) => {
      if (opening.start > currentPos) {
        const segmentLength = opening.start - currentPos;
        const segmentCenter = currentPos + segmentLength / 2;

        segments.push({
          key: `${wall}-baseboard-before-${index}`,
          position: getWallAlignedTransform(
            room,
            wall,
            segmentCenter,
            baseboardHeight / 2
          ).position,
          size: getWallSegmentSize(
            room,
            wall,
            segmentLength,
            baseboardHeight,
            baseboardThickness
          ),
        });
      }

      currentPos = opening.end;
    });

    if (currentPos < wallLength) {
      const segmentLength = wallLength - currentPos;
      const segmentCenter = currentPos + segmentLength / 2;

      segments.push({
        key: `${wall}-baseboard-after`,
        position: getWallAlignedTransform(
          room,
          wall,
          segmentCenter,
          baseboardHeight / 2
        ).position,
        size: getWallSegmentSize(
          room,
          wall,
          segmentLength,
          baseboardHeight,
          baseboardThickness
        ),
      });
    }
  });

  return segments;
}

export function getSceneCameraConfig(room: Room): SceneCameraConfig {
  const diagonal = Math.hypot(room.width, room.height);
  const roomSpan = Math.max(room.width, room.height);
  const target: Vector3Tuple = [
    room.width / 2,
    room.ceilingHeight * 0.42,
    room.height / 2,
  ];

  return {
    position: [
      target[0] + diagonal * 0.72,
      room.ceilingHeight * 0.95 + roomSpan * 0.08,
      target[2] + diagonal * 0.58,
    ],
    target,
    keyLightPosition: [
      room.width * 0.16,
      room.ceilingHeight * 1.35,
      room.height * 0.08,
    ],
    fillLightPosition: [
      room.width * 0.88,
      room.ceilingHeight * 0.78,
      room.height * 0.92,
    ],
    contactShadowScale: [room.width * 1.12, room.height * 1.12],
    minDistance: Math.max(roomSpan * 0.45, 900),
    maxDistance: Math.max(diagonal * 3.1, roomSpan * 2.8),
    near: 10,
    far: Math.max(diagonal * 5, room.ceilingHeight * 9),
    fov: 42,
  };
}

export function getDoorSwingPlacement(
  door: Door,
  room: Room
): DoorSwingPlacement {
  const doorY = door.height / 2;
  const hingeAlong =
    door.wall === "north" || door.wall === "west"
      ? door.offset + (door.hinge === "left" ? 0 : door.width)
      : door.offset + (door.hinge === "left" ? door.width : 0);
  const isVerticalWall = door.wall === "east" || door.wall === "west";
  const baseAngle =
    door.swing === "inward"
      ? door.hinge === "left"
        ? -90
        : 90
      : door.hinge === "left"
        ? 90
        : -90;
  const { position, rotationY } = getWallAlignedTransform(
    room,
    door.wall,
    hingeAlong,
    doorY
  );

  return {
    hingePosition: position,
    baseRotation: rotationY,
    zOffset:
      door.swing === "inward"
        ? room.wallThickness / 2
        : -room.wallThickness / 2,
    hingeDir: door.hinge === "left" ? 1 : -1,
    maxOpenAngle:
      ((isVerticalWall ? -baseAngle : baseAngle) * Math.PI) / 180,
  };
}

export function getSlidingDoorPlacement(door: Door, room: Room) {
  const { position, rotationY } = getWallAlignedTransform(
    room,
    door.wall,
    door.offset + door.width / 2,
    door.height / 2
  );

  return {
    position,
    rotationY,
  };
}

export function getWindowPlacement(window: Window, room: Room): {
  position: Vector3Tuple;
  rotation: RotationTuple;
} {
  const { position, rotationY } = getWallAlignedTransform(
    room,
    window.wall,
    window.offset + window.width / 2,
    window.sillHeight + window.height / 2
  );

  return {
    position,
    rotation: [0, rotationY, 0],
  };
}

export function getWindowSlideTargets(
  openSide: "left" | "right" | null,
  panelWidth: number
) {
  return {
    leftTarget: openSide === "left" ? panelWidth : 0,
    rightTarget: openSide === "right" ? -panelWidth : 0,
  };
}

export function interpolateAnimatedValue(
  current: number,
  target: number,
  smoothing: number,
  snapThreshold: number
): number {
  const diff = target - current;

  if (Math.abs(diff) < snapThreshold) {
    return target;
  }

  return current + diff * smoothing;
}

export function checkDoorFurnitureCollision({
  angle,
  hingeX,
  hingeZ,
  baseRotation,
  doorWidth,
  hingeDir,
  zOffset,
  doorHalfThickness,
  furniture,
  margin = 15,
}: DoorCollisionInput): boolean {
  const totalAngle = baseRotation + angle;
  const cosA = Math.cos(totalAngle);
  const sinA = Math.sin(totalAngle);
  const zLines = [
    zOffset - doorHalfThickness,
    zOffset,
    zOffset + doorHalfThickness,
  ];

  for (const z of zLines) {
    for (let step = 1; step <= 10; step += 1) {
      const radius = (doorWidth * step) / 10;
      const worldX = hingeX + hingeDir * radius * cosA + z * sinA;
      const worldZ = hingeZ - hingeDir * radius * sinA + z * cosA;

      for (const item of furniture) {
        const centerX = item.x + item.width / 2;
        const centerZ = item.y + item.depth / 2;
        const dx = worldX - centerX;
        const dz = worldZ - centerZ;
        const rotation = (item.rotation * Math.PI) / 180;
        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);
        const localX = dx * cosR + dz * sinR;
        const localZ = -dx * sinR + dz * cosR;

        if (
          Math.abs(localX) <= item.width / 2 + margin &&
          Math.abs(localZ) <= item.depth / 2 + margin
        ) {
          return true;
        }
      }
    }
  }

  return false;
}
