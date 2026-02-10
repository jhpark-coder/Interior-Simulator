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

/**
 * Gets the four corners of a rotated furniture item
 */
function getRotatedCorners(item: FurnitureItem): { x: number; y: number }[] {
  const rad = degToRad(item.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x: 0, y: 0 },
    { x: item.width, y: 0 },
    { x: item.width, y: item.depth },
    { x: 0, y: item.depth },
  ];

  return corners.map((corner) => ({
    x: item.x + corner.x * cos - corner.y * sin,
    y: item.y + corner.x * sin + corner.y * cos,
  }));
}

/**
 * Projects a polygon onto an axis and returns min/max values
 */
function projectPolygon(
  corners: { x: number; y: number }[],
  axis: { x: number; y: number }
): { min: number; max: number } {
  let min = corners[0].x * axis.x + corners[0].y * axis.y;
  let max = min;

  for (let i = 1; i < corners.length; i++) {
    const projection = corners[i].x * axis.x + corners[i].y * axis.y;
    if (projection < min) min = projection;
    if (projection > max) max = projection;
  }

  return { min, max };
}

/**
 * Checks if two furniture items are overlapping using Separating Axis Theorem (SAT)
 */
export function checkFurnitureCollision(
  item1: FurnitureItem,
  item2: FurnitureItem
): boolean {
  const corners1 = getRotatedCorners(item1);
  const corners2 = getRotatedCorners(item2);

  // Get axes to test (perpendicular to edges of both rectangles)
  const axes: { x: number; y: number }[] = [];

  // Axes from item1
  for (let i = 0; i < 4; i++) {
    const edge = {
      x: corners1[(i + 1) % 4].x - corners1[i].x,
      y: corners1[(i + 1) % 4].y - corners1[i].y,
    };
    const length = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
    // Perpendicular axis (normalized)
    axes.push({ x: -edge.y / length, y: edge.x / length });
  }

  // Axes from item2
  for (let i = 0; i < 4; i++) {
    const edge = {
      x: corners2[(i + 1) % 4].x - corners2[i].x,
      y: corners2[(i + 1) % 4].y - corners2[i].y,
    };
    const length = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
    // Perpendicular axis (normalized)
    axes.push({ x: -edge.y / length, y: edge.x / length });
  }

  // Test each axis
  for (const axis of axes) {
    const projection1 = projectPolygon(corners1, axis);
    const projection2 = projectPolygon(corners2, axis);

    // Check if projections overlap
    if (projection1.max < projection2.min || projection2.max < projection1.min) {
      // Found a separating axis, no collision
      return false;
    }
  }

  // No separating axis found, collision detected
  return true;
}

/**
 * Checks if a furniture item collides with any other furniture
 */
export function checkCollisionWithOthers(
  item: FurnitureItem,
  allFurniture: FurnitureItem[]
): boolean {
  for (const other of allFurniture) {
    if (other.id === item.id) continue;
    if (checkFurnitureCollision(item, other)) {
      return true;
    }
  }
  return false;
}
