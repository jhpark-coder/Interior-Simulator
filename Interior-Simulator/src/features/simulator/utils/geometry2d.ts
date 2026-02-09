import type { FurnitureItem, Room } from "../types";

/**
 * Converts degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Gets the rotated bounding box corners of a furniture item
 */
export function getRotatedBounds(item: FurnitureItem): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const rad = degToRad(item.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Four corners of the rectangle
  const corners = [
    { x: 0, y: 0 },
    { x: item.width, y: 0 },
    { x: item.width, y: item.depth },
    { x: 0, y: item.depth },
  ];

  // Rotate each corner
  const rotated = corners.map((corner) => ({
    x: item.x + corner.x * cos - corner.y * sin,
    y: item.y + corner.x * sin + corner.y * cos,
  }));

  // Find bounding box
  const xs = rotated.map((p) => p.x);
  const ys = rotated.map((p) => p.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Constrains furniture position to stay within room boundaries
 */
export function constrainToRoom(
  item: FurnitureItem,
  room: Room
): { x: number; y: number } {
  const bounds = getRotatedBounds(item);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const offsetX = item.x - bounds.minX;
  const offsetY = item.y - bounds.minY;

  let x = item.x;
  let y = item.y;

  // Constrain to room boundaries
  if (bounds.minX < 0) {
    x = offsetX;
  }
  if (bounds.minY < 0) {
    y = offsetY;
  }
  if (bounds.maxX > room.width) {
    x = room.width - width + offsetX;
  }
  if (bounds.maxY > room.height) {
    y = room.height - height + offsetY;
  }

  return { x, y };
}
