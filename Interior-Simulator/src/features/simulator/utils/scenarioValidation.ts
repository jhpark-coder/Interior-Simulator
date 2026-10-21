import type { FloorStructure, Vec2, Wall } from "../domain/structure";
import {
  pointAlongWall,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  projectPointToWall,
  segmentIntersection,
  wallLength,
} from "../domain/structure";
import type { FurnitureItem } from "../types";
import { getRotatedCorners } from "./geometry2d";

const TOLERANCE = 0.5;

function pointOnSegment(point: Vec2, start: Vec2, end: Vec2): boolean {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length <= TOLERANCE) return false;
  const cross =
    (point.y - start.y) * (end.x - start.x) -
    (point.x - start.x) * (end.y - start.y);
  if (Math.abs(cross) > TOLERANCE * length) return false;
  const dot =
    (point.x - start.x) * (end.x - start.x) +
    (point.y - start.y) * (end.y - start.y);
  return dot >= -TOLERANCE && dot <= length * length + TOLERANCE;
}

function pointInsideOrOnRoom(point: Vec2, polygon: Vec2[]): boolean {
  if (pointInPolygon(point, polygon)) return true;
  return polygon.some((current, index) =>
    pointOnSegment(point, current, polygon[(index + 1) % polygon.length])
  );
}

function pointInsideFurniture(point: Vec2, corners: Vec2[]): boolean {
  return pointInPolygon(point, corners);
}

type SolidWallInterval = {
  wall: Wall;
  startOffset: number;
  endOffset: number;
};

function solidWallIntervals(
  structure: FloorStructure
): SolidWallInterval[] {
  return structure.walls.flatMap((wall) => {
    const openings = structure.openings
      .filter((opening) => opening.wallId === wall.id)
      .sort((a, b) => a.offset - b.offset);
    const intervals: SolidWallInterval[] = [];
    let cursor = 0;
    for (const opening of openings) {
      if (opening.offset > cursor) {
        intervals.push({
          wall,
          startOffset: cursor,
          endOffset: opening.offset,
        });
      }
      cursor = Math.max(cursor, opening.offset + opening.width);
    }
    if (cursor < wallLength(wall)) {
      intervals.push({
        wall,
        startOffset: cursor,
        endOffset: wallLength(wall),
      });
    }
    return intervals;
  });
}

function segmentCrossesFurniture(
  start: Vec2,
  end: Vec2,
  corners: Vec2[]
): boolean {
  if (pointInsideFurniture(start, corners) || pointInsideFurniture(end, corners)) {
    return true;
  }
  return corners.some((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    return segmentIntersection(start, end, corner, next)?.proper === true;
  });
}

const INTERIOR_SAMPLE_STEPS = 24;

function distanceToPolygonEdge(point: Vec2, polygon: Vec2[]): number {
  return Math.min(
    ...polygon.map(
      (start, index) =>
        projectPointToWall(point, {
          start,
          end: polygon[(index + 1) % polygon.length],
        }).distance
    )
  );
}

// 무게중심이 방 밖(L자 빈 모서리 등)이면 벽에서 가장 먼 내부 격자점을 고른다.
function interiorPoint(polygon: Vec2[]): Vec2 {
  const centroid = polygonCentroid(polygon);
  if (pointInPolygon(centroid, polygon)) return centroid;
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const stepX = (Math.max(...xs) - minX) / INTERIOR_SAMPLE_STEPS;
  const stepY = (Math.max(...ys) - minY) / INTERIOR_SAMPLE_STEPS;
  let best = centroid;
  let bestClearance = -Infinity;
  for (let i = 1; i < INTERIOR_SAMPLE_STEPS; i += 1) {
    for (let j = 1; j < INTERIOR_SAMPLE_STEPS; j += 1) {
      const point = { x: minX + stepX * i, y: minY + stepY * j };
      if (!pointInPolygon(point, polygon)) continue;
      const clearance = distanceToPolygonEdge(point, polygon);
      if (clearance > bestClearance) {
        best = point;
        bestClearance = clearance;
      }
    }
  }
  return best;
}

/**
 * 새 가구의 기본 중심점. 구조 bounds나 구형 room이 아니라 가장 큰 방
 * 폴리곤 내부를 기준으로 한다. 방이 없으면 fallback을 쓴다.
 */
export function defaultFurnitureCenter(
  structure: FloorStructure,
  fallback: Vec2
): Vec2 {
  if (structure.rooms.length === 0) return fallback;
  const largest = structure.rooms.reduce((best, room) =>
    polygonArea(room.polygon) > polygonArea(best.polygon) ? room : best
  );
  return interiorPoint(largest.polygon);
}

export type FurniturePlacementValidation = {
  valid: boolean;
  reason?: "outside-structure" | "crosses-wall";
};

export function validateFurnitureInStructure(
  item: FurnitureItem,
  structure: FloorStructure
): FurniturePlacementValidation {
  if (structure.rooms.length === 0) {
    return { valid: false, reason: "outside-structure" };
  }
  const corners = getRotatedCorners(item);
  const inside = corners.every((corner) =>
    structure.rooms.some((room) =>
      pointInsideOrOnRoom(corner, room.polygon)
    )
  );
  if (!inside) return { valid: false, reason: "outside-structure" };

  const crossesWall = solidWallIntervals(structure).some((interval) =>
    segmentCrossesFurniture(
      pointAlongWall(interval.wall, interval.startOffset),
      pointAlongWall(interval.wall, interval.endOffset),
      corners
    )
  );
  if (crossesWall) return { valid: false, reason: "crosses-wall" };
  return { valid: true };
}
