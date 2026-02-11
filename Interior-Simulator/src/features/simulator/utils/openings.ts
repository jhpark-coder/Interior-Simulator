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
 * Calculates door arc points for visualization
 */
export function getDoorArcPoints(
  door: Door,
  room: Room
): { centerX: number; centerY: number; radius: number; startAngle: number; endAngle: number } {
  const pos = getOpeningPosition(door.wall, door.offset, room);
  const radius = door.width;

  // Calculate hinge position
  let hingeX = pos.x;
  let hingeY = pos.y;

  // Adjust hinge based on wall and hinge side
  const isHorizontalWall = door.wall === "north" || door.wall === "south";

  if (isHorizontalWall) {
    hingeX += door.hinge === "left" ? 0 : door.width;
  } else {
    hingeY += door.hinge === "left" ? 0 : door.width;
  }

  // Calculate angles based on wall, swing, and hinge
  let startAngle = 0;
  let endAngle = door.openAngle;

  switch (door.wall) {
    case "north":
      if (door.swing === "inward") {
        // 안쪽(방 내부, 남쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 0 : 90;
      } else {
        // 바깥쪽(방 외부, 북쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 270 : 180;
      }
      break;
    case "south":
      if (door.swing === "inward") {
        // 안쪽(방 내부, 북쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 180 : 270;
      } else {
        // 바깥쪽(방 외부, 남쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 90 : 0;
      }
      break;
    case "east":
      if (door.swing === "inward") {
        // 안쪽(방 내부, 서쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 90 : 180;
      } else {
        // 바깥쪽(방 외부, 동쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 0 : 270;
      }
      break;
    case "west":
      if (door.swing === "inward") {
        // 안쪽(방 내부, 동쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 270 : 0;
      } else {
        // 바깥쪽(방 외부, 서쪽 방향)으로 열림
        startAngle = door.hinge === "left" ? 180 : 90;
      }
      break;
  }

  endAngle = startAngle + door.openAngle * (door.hinge === "left" ? 1 : -1);

  return {
    centerX: hingeX,
    centerY: hingeY,
    radius,
    startAngle,
    endAngle,
  };
}
