import type { Door, Window, WallSide, Room } from "../types";

/**
 * Gets the length of a wall side
 */
export function getWallLength(wall: WallSide, room: Room): number {
  switch (wall) {
    case "north":
    case "south":
      return room.width;
    case "east":
    case "west":
      return room.height;
  }
}

/**
 * Gets the 2D position of an opening on a wall
 */
export function getOpeningPosition(
  wall: WallSide,
  offset: number,
  room: Room
): { x: number; y: number; rotation: number } {
  switch (wall) {
    case "north":
      return { x: offset, y: 0, rotation: 0 };
    case "south":
      return { x: offset, y: room.height, rotation: 180 };
    case "east":
      return { x: room.width, y: offset, rotation: 90 };
    case "west":
      return { x: 0, y: offset, rotation: 270 };
  }
}

/**
 * Checks if an opening is within wall boundaries
 */
export function isOpeningInBounds(
  wall: WallSide,
  offset: number,
  width: number,
  room: Room
): boolean {
  const wallLength = getWallLength(wall, room);
  return offset >= 0 && offset + width <= wallLength;
}

/**
 * Constrains an opening offset to stay within wall boundaries
 */
export function constrainOpeningOffset(
  wall: WallSide,
  offset: number,
  width: number,
  room: Room
): number {
  const wallLength = getWallLength(wall, room);
  const maxOffset = Math.max(0, wallLength - width);
  return Math.max(0, Math.min(offset, maxOffset));
}

/**
 * Checks if two openings on the same wall overlap
 */
export function doOpeningsOverlap(
  offset1: number,
  width1: number,
  offset2: number,
  width2: number
): boolean {
  const end1 = offset1 + width1;
  const end2 = offset2 + width2;
  return !(end1 <= offset2 || end2 <= offset1);
}

/**
 * Validates if a door can be placed without overlapping other openings
 */
export function validateDoorPlacement(
  door: Door,
  doors: Door[],
  windows: Window[],
  room: Room
): { valid: boolean; error?: string } {
  // Check wall bounds
  if (!isOpeningInBounds(door.wall, door.offset, door.width, room)) {
    return { valid: false, error: "Door exceeds wall boundaries" };
  }

  // Check overlap with other doors on the same wall
  for (const other of doors) {
    if (other.id !== door.id && other.wall === door.wall) {
      if (doOpeningsOverlap(door.offset, door.width, other.offset, other.width)) {
        return { valid: false, error: "Door overlaps with another door" };
      }
    }
  }

  // Check overlap with windows on the same wall
  for (const window of windows) {
    if (window.wall === door.wall) {
      if (doOpeningsOverlap(door.offset, door.width, window.offset, window.width)) {
        return { valid: false, error: "Door overlaps with a window" };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates if a window can be placed without overlapping other openings
 */
export function validateWindowPlacement(
  window: Window,
  doors: Door[],
  windows: Window[],
  room: Room
): { valid: boolean; error?: string } {
  // Check wall bounds
  if (!isOpeningInBounds(window.wall, window.offset, window.width, room)) {
    return { valid: false, error: "Window exceeds wall boundaries" };
  }

  // Check overlap with doors on the same wall
  for (const door of doors) {
    if (door.wall === window.wall) {
      if (doOpeningsOverlap(window.offset, window.width, door.offset, door.width)) {
        return { valid: false, error: "Window overlaps with a door" };
      }
    }
  }

  // Check overlap with other windows on the same wall
  for (const other of windows) {
    if (other.id !== window.id && other.wall === window.wall) {
      if (
        doOpeningsOverlap(window.offset, window.width, other.offset, other.width)
      ) {
        return { valid: false, error: "Window overlaps with another window" };
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates door arc data for visualization (in Group-local coordinates)
 */
export function getDoorArcPoints(
  door: Door,
  _room: Room
): {
  hingeX: number;
  hingeY: number;
  radius: number;
  closedAngle: number;
  openAngle: number;
} {
  const isHorizontalWall = door.wall === "north" || door.wall === "south";

  // 경첩의 로컬 좌표 (Group 기준)
  let hingeX: number;
  let hingeY: number;

  if (isHorizontalWall) {
    hingeX = door.hinge === "left" ? 0 : door.width;
    hingeY = 0;
  } else {
    hingeX = 0;
    hingeY = door.hinge === "left" ? 0 : door.width;
  }

  // 닫힌 상태에서의 각도 (경첩에서 문 끝 방향)
  // 0°=오른쪽, 90°=아래, 180°=왼쪽, 270°=위
  let closedAngle: number;
  if (isHorizontalWall) {
    closedAngle = door.hinge === "left" ? 0 : 180;
  } else {
    closedAngle = door.hinge === "left" ? 90 : 270;
  }

  // sweep 방향 결정
  // inward일 때 양의 방향(시계)인 조합
  const isPositiveSweepInward =
    ((door.wall === "north" || door.wall === "east") && door.hinge === "left") ||
    ((door.wall === "south" || door.wall === "west") && door.hinge === "right");

  const sweepSign = door.swing === "inward"
    ? (isPositiveSweepInward ? 1 : -1)
    : (isPositiveSweepInward ? -1 : 1);

  const openAngle = closedAngle + door.openAngle * sweepSign;

  return {
    hingeX,
    hingeY,
    radius: door.width,
    closedAngle,
    openAngle,
  };
}
