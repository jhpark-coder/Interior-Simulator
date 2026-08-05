import {
  pointAlongWall,
  wallAngle,
  wallLength,
  type FloorStructure,
  type Opening,
  type Wall,
} from "../domain/structure";

export type StructureBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type WallMeshSegment = {
  key: string;
  wallId: string;
  position: [number, number, number];
  size: [number, number, number];
  rotationY: number;
};

export type OpeningMeshPlacement = {
  position: [number, number, number];
  rotationY: number;
  wallThickness: number;
};

export function getStructureBounds(structure: FloorStructure): StructureBounds {
  if (structure.walls.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 5000,
      maxY: 4000,
      width: 5000,
      height: 4000,
      centerX: 2500,
      centerY: 2000,
    };
  }
  const points = structure.walls.flatMap((wall) => [wall.start, wall.end]);
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function makeSegment(
  wall: Wall,
  key: string,
  offset: number,
  length: number,
  bottom: number,
  height: number
): WallMeshSegment | null {
  if (length <= 0 || height <= 0) return null;
  const center = pointAlongWall(wall, offset + length / 2);
  return {
    key: `${wall.id}:${key}`,
    wallId: wall.id,
    position: [center.x, bottom + height / 2, center.y],
    size: [length, height, wall.thickness],
    rotationY: -wallAngle(wall),
  };
}

function wallSegmentsAroundOpenings(
  wall: Wall,
  openings: Opening[]
): WallMeshSegment[] {
  const length = wallLength(wall);
  const sorted = openings
    .filter((opening) => opening.wallId === wall.id)
    .map((opening) => ({
      ...opening,
      offset: Math.max(0, Math.min(length, opening.offset)),
      width: Math.max(
        0,
        Math.min(opening.width, length - Math.max(0, opening.offset))
      ),
    }))
    .sort((a, b) => a.offset - b.offset);
  const segments: WallMeshSegment[] = [];
  let cursor = 0;

  sorted.forEach((opening, index) => {
    const before = makeSegment(
      wall,
      `full-${index}`,
      cursor,
      opening.offset - cursor,
      0,
      wall.height
    );
    if (before) segments.push(before);

    const bottomHeight =
      opening.kind === "window" ? Math.min(opening.sillHeight, wall.height) : 0;
    const bottom = makeSegment(
      wall,
      `opening-bottom-${index}`,
      opening.offset,
      opening.width,
      0,
      bottomHeight
    );
    if (bottom) segments.push(bottom);

    const openingTop = Math.min(
      wall.height,
      opening.sillHeight + opening.height
    );
    const top = makeSegment(
      wall,
      `opening-top-${index}`,
      opening.offset,
      opening.width,
      openingTop,
      wall.height - openingTop
    );
    if (top) segments.push(top);
    cursor = Math.max(cursor, opening.offset + opening.width);
  });

  const after = makeSegment(
    wall,
    "full-after",
    cursor,
    length - cursor,
    0,
    wall.height
  );
  if (after) segments.push(after);
  return segments;
}

export function buildStructureWallSegments(
  structure: FloorStructure
): WallMeshSegment[] {
  return structure.walls.flatMap((wall) =>
    wallSegmentsAroundOpenings(wall, structure.openings)
  );
}

export function getOpeningMeshPlacement(
  opening: Opening,
  wall: Wall
): OpeningMeshPlacement {
  const center = pointAlongWall(wall, opening.offset + opening.width / 2);
  return {
    position: [
      center.x,
      opening.sillHeight + opening.height / 2,
      center.y,
    ],
    rotationY: -wallAngle(wall),
    wallThickness: wall.thickness,
  };
}
