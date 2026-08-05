import {
  pointAlongWall,
  pointInPolygon,
  segmentIntersection,
  wallLength,
  type FloorStructure,
  type Vec2,
  type Wall,
} from "../domain/structure";

type Segment = { start: Vec2; end: Vec2; wall: Wall };

function pointSegmentDistance(point: Vec2, start: Vec2, end: Vec2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared
    )
  );
  return Math.hypot(
    point.x - (start.x + dx * t),
    point.y - (start.y + dy * t)
  );
}

function solidWallSegments(structure: FloorStructure): Segment[] {
  return structure.walls.flatMap((wall) => {
    const openings = structure.openings
      .filter(
        (opening) =>
          opening.wallId === wall.id &&
          opening.sillHeight <= 100 &&
          opening.height >= 1700
      )
      .sort((a, b) => a.offset - b.offset);
    const segments: Segment[] = [];
    let cursor = 0;
    for (const opening of openings) {
      if (opening.offset > cursor) {
        segments.push({
          wall,
          start: pointAlongWall(wall, cursor),
          end: pointAlongWall(wall, opening.offset),
        });
      }
      cursor = Math.max(cursor, opening.offset + opening.width);
    }
    const length = wallLength(wall);
    if (cursor < length) {
      segments.push({
        wall,
        start: pointAlongWall(wall, cursor),
        end: pointAlongWall(wall, length),
      });
    }
    return segments;
  });
}

function insideAnyRoom(position: Vec2, structure: FloorStructure): boolean {
  return structure.rooms.some((room) =>
    pointInPolygon(position, room.polygon)
  );
}

export function findWalkStartPosition(
  structure: FloorStructure,
  radius = 120
): Vec2 | null {
  for (const room of structure.rooms) {
    if (room.polygon.length < 3) continue;
    const centroid = {
      x:
        room.polygon.reduce((sum, point) => sum + point.x, 0) /
        room.polygon.length,
      y:
        room.polygon.reduce((sum, point) => sum + point.y, 0) /
        room.polygon.length,
    };
    if (isWalkPositionValid(centroid, structure, radius)) return centroid;

    const xs = room.polygon.map((point) => point.x);
    const ys = room.polygon.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const candidates: Vec2[] = [];
    const divisions = 7;
    for (let row = 0; row < divisions; row += 1) {
      for (let column = 0; column < divisions; column += 1) {
        candidates.push({
          x: minX + ((column + 0.5) / divisions) * (maxX - minX),
          y: minY + ((row + 0.5) / divisions) * (maxY - minY),
        });
      }
    }
    candidates.sort(
      (left, right) =>
        Math.hypot(left.x - centroid.x, left.y - centroid.y) -
        Math.hypot(right.x - centroid.x, right.y - centroid.y)
    );
    const valid = candidates.find((candidate) =>
      isWalkPositionValid(candidate, structure, radius)
    );
    if (valid) return valid;
  }
  return null;
}

export function isWalkPositionValid(
  position: Vec2,
  structure: FloorStructure,
  radius = 120
): boolean {
  if (!insideAnyRoom(position, structure)) return false;
  return solidWallSegments(structure).every(
    (segment) =>
      pointSegmentDistance(position, segment.start, segment.end) >
      radius + segment.wall.thickness / 2
  );
}

export function canWalkBetween(
  from: Vec2,
  to: Vec2,
  structure: FloorStructure,
  radius = 120
): boolean {
  if (!isWalkPositionValid(to, structure, radius)) return false;
  return solidWallSegments(structure).every((segment) => {
    const intersection = segmentIntersection(
      from,
      to,
      segment.start,
      segment.end
    );
    return intersection?.proper !== true;
  });
}

export function findWalkLookTarget(
  position: Vec2,
  structure: FloorStructure
): Vec2 {
  const directions = [
    { x: Math.SQRT1_2, y: Math.SQRT1_2 },
    { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
    { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ];
  for (const distance of [900, 600, 300]) {
    for (const direction of directions) {
      const target = {
        x: position.x + direction.x * distance,
        y: position.y + direction.y * distance,
      };
      if (canWalkBetween(position, target, structure)) return target;
    }
  }
  return { x: position.x, y: position.y - 1 };
}
