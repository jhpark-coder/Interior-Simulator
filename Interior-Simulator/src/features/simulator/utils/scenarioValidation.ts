import type { FloorStructure, Vec2, Wall } from "../domain/structure";
import {
  pointAlongWall,
  pointInPolygon,
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
