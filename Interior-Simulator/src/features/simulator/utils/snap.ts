import type { Room } from "../types";

/**
 * Snaps a value to the nearest grid line
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snaps a position to the grid if snap is enabled
 */
export function snapPosition(
  x: number,
  y: number,
  room: Room
): { x: number; y: number } {
  if (!room.snapEnabled) {
    return { x, y };
  }
  return {
    x: snapToGrid(x, room.gridSize),
    y: snapToGrid(y, room.gridSize),
  };
}

/**
 * Snaps a wall offset to the grid
 */
export function snapWallOffset(offset: number, gridSize: number): number {
  return snapToGrid(offset, gridSize);
}
