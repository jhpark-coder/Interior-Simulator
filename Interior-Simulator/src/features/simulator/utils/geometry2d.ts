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
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.depth / 2;

  // Four corners of the rectangle relative to center
  const corners = [
    { x: -item.width / 2, y: -item.depth / 2 },
    { x: item.width / 2, y: -item.depth / 2 },
    { x: item.width / 2, y: item.depth / 2 },
    { x: -item.width / 2, y: item.depth / 2 },
  ];

  // Rotate each corner
  const rotated = corners.map((corner) => ({
    x: centerX + corner.x * cos - corner.y * sin,
    y: centerY + corner.x * sin + corner.y * cos,
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
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.depth / 2;

  const corners = [
    { x: -item.width / 2, y: -item.depth / 2 },
    { x: item.width / 2, y: -item.depth / 2 },
    { x: item.width / 2, y: item.depth / 2 },
    { x: -item.width / 2, y: item.depth / 2 },
  ];

  return corners.map((corner) => ({
    x: centerX + corner.x * cos - corner.y * sin,
    y: centerY + corner.x * sin + corner.y * cos,
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
 * Returns the height of free space underneath the item (e.g. under a desk tabletop).
 */
function getClearanceHeight(item: FurnitureItem): number {
  switch (item.type) {
    case "desk":
    case "table":
      return item.height - 25; // tabletop ~25mm thick
    default:
      return 0;
  }
}

/**
 * Returns the height of the portion that can tuck under another item
 * (e.g. a chair's base+armrests, excluding the tall backrest).
 */
function getTuckHeight(item: FurnitureItem): number {
  switch (item.type) {
    case "chair":
      return item.height * 0.47; // up to armrest height
    default:
      return item.height;
  }
}

/**
 * SAT collision check between two sets of corners.
 */
function checkCornersCollision(
  corners1: { x: number; y: number }[],
  corners2: { x: number; y: number }[],
): boolean {
  const axes: { x: number; y: number }[] = [];

  for (const corners of [corners1, corners2]) {
    for (let i = 0; i < corners.length; i++) {
      const edge = {
        x: corners[(i + 1) % corners.length].x - corners[i].x,
        y: corners[(i + 1) % corners.length].y - corners[i].y,
      };
      const length = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
      if (length > 0) {
        axes.push({ x: -edge.y / length, y: edge.x / length });
      }
    }
  }

  for (const axis of axes) {
    const p1 = projectPolygon(corners1, axis);
    const p2 = projectPolygon(corners2, axis);
    if (p1.max < p2.min || p2.max < p1.min) return false;
  }
  return true;
}

/**
 * Returns the rotated corners of the backrest zone (back ~25% of chair depth).
 * The backrest is the tall portion that cannot fit under a desk.
 */
function getBackrestCorners(item: FurnitureItem): { x: number; y: number }[] | null {
  if (item.type !== "chair") return null;

  const backrestRatio = 0.25;
  const backrestD = item.depth * backrestRatio;

  const rad = degToRad(item.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = item.x + item.width / 2;
  const cy = item.y + item.depth / 2;

  // Backrest is at the back of the chair (negative local Y direction)
  const localCY = -item.depth / 2 + backrestD / 2;
  const hw = item.width / 2;
  const hd = backrestD / 2;

  const local = [
    { x: -hw, y: localCY - hd },
    { x: hw, y: localCY - hd },
    { x: hw, y: localCY + hd },
    { x: -hw, y: localCY + hd },
  ];

  return local.map((c) => ({
    x: cx + c.x * cos - c.y * sin,
    y: cy + c.x * sin + c.y * cos,
  }));
}

/**
 * Checks if two furniture items are overlapping using Separating Axis Theorem (SAT).
 * When a chair can tuck under a desk/table, only the backrest zone is checked for collision.
 */
export function checkFurnitureCollision(
  item1: FurnitureItem,
  item2: FurnitureItem
): boolean {
  // Height-aware: if one item's low portion fits under the other's clearance,
  // only check the tall portion (backrest) against the other item.
  if (getTuckHeight(item1) <= getClearanceHeight(item2)) {
    const backrest = getBackrestCorners(item1);
    if (backrest) {
      return checkCornersCollision(backrest, getRotatedCorners(item2));
    }
    return false;
  }
  if (getTuckHeight(item2) <= getClearanceHeight(item1)) {
    const backrest = getBackrestCorners(item2);
    if (backrest) {
      return checkCornersCollision(getRotatedCorners(item1), backrest);
    }
    return false;
  }

  return checkCornersCollision(getRotatedCorners(item1), getRotatedCorners(item2));
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

/**
 * Point type for polygon operations
 */
type Point = { x: number; y: number };

function getPolygonSignedArea(polygon: Point[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

/**
 * Clips a polygon against an edge using Sutherland-Hodgman algorithm
 */
function clipPolygonByEdge(
  polygon: Point[],
  edge: [Point, Point],
  clipPolygonClockwise: boolean
): Point[] {
  if (polygon.length === 0) return [];

  const [p1, p2] = edge;
  const edgeVec = { x: p2.x - p1.x, y: p2.y - p1.y };
  const result: Point[] = [];
  const epsilon = 1e-9;

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    // Use edge x point cross product to consistently determine inside/outside.
    const currentSide =
      edgeVec.x * (current.y - p1.y) - edgeVec.y * (current.x - p1.x);
    const nextSide = edgeVec.x * (next.y - p1.y) - edgeVec.y * (next.x - p1.x);
    const currentInside = clipPolygonClockwise
      ? currentSide <= epsilon
      : currentSide >= -epsilon;
    const nextInside = clipPolygonClockwise ? nextSide <= epsilon : nextSide >= -epsilon;

    if (currentInside) {
      result.push(current);
      if (!nextInside) {
        // Edge crosses from inside to outside, add intersection
        const intersection = getLineIntersection(current, next, p1, p2);
        if (intersection) result.push(intersection);
      }
    } else if (nextInside) {
      // Edge crosses from outside to inside, add intersection
      const intersection = getLineIntersection(current, next, p1, p2);
      if (intersection) result.push(intersection);
    }
  }

  return result;
}

/**
 * Gets the intersection point of two line segments
 */
function getLineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const denom =
    (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-10) return null;

  const t =
    ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;

  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

/**
 * Calculates the intersection polygon of two furniture items using Sutherland-Hodgman algorithm
 */
export function getPolygonIntersection(
  item1: FurnitureItem,
  item2: FurnitureItem
): Point[] {
  const corners1 = getRotatedCorners(item1);
  const corners2 = getRotatedCorners(item2);
  const clipPolygonClockwise = getPolygonSignedArea(corners2) < 0;

  // Start with corners1 as the subject polygon
  let result = [...corners1];

  // Clip against each edge of corners2
  for (let i = 0; i < corners2.length; i++) {
    const edge: [Point, Point] = [corners2[i], corners2[(i + 1) % corners2.length]];
    result = clipPolygonByEdge(result, edge, clipPolygonClockwise);
    if (result.length === 0) break;
  }

  return result;
}

/**
 * Gets all collision polygons for a furniture item with other furniture
 */
export function getCollisionPolygons(
  item: FurnitureItem,
  allFurniture: FurnitureItem[]
): Point[][] {
  const collisions: Point[][] = [];

  for (const other of allFurniture) {
    if (other.id === item.id) continue;
    if (checkFurnitureCollision(item, other)) {
      const intersection = getPolygonIntersection(item, other);
      if (intersection.length > 0) {
        collisions.push(intersection);
      }
    }
  }

  return collisions;
}
