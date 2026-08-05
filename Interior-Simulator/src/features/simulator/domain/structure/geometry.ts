import type {
  FloorStructure,
  Opening,
  RoomRegion,
  StructureIssue,
  Vec2,
  Wall,
  WallEndpoint,
} from "./types";
import { MANUAL_SOURCE } from "./types";

export const GEOMETRY_EPSILON = 0.001;
export const MIN_WALL_LENGTH = 50;

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pointsEqual(
  a: Vec2,
  b: Vec2,
  tolerance = GEOMETRY_EPSILON
): boolean {
  return distance(a, b) <= tolerance;
}

export function wallLength(wall: Pick<Wall, "start" | "end">): number {
  return distance(wall.start, wall.end);
}

export function wallAngle(wall: Pick<Wall, "start" | "end">): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
}

export function wallDirection(wall: Pick<Wall, "start" | "end">): Vec2 {
  const length = wallLength(wall);
  if (length <= GEOMETRY_EPSILON) {
    return { x: 0, y: 0 };
  }
  return {
    x: (wall.end.x - wall.start.x) / length,
    y: (wall.end.y - wall.start.y) / length,
  };
}

export function wallNormal(wall: Pick<Wall, "start" | "end">): Vec2 {
  const direction = wallDirection(wall);
  return { x: -direction.y, y: direction.x };
}

export function pointAlongWall(
  wall: Pick<Wall, "start" | "end">,
  offset: number
): Vec2 {
  const direction = wallDirection(wall);
  return {
    x: wall.start.x + direction.x * offset,
    y: wall.start.y + direction.y * offset,
  };
}

export type PointProjection = {
  point: Vec2;
  distance: number;
  offset: number;
  t: number;
};

export function projectPointToWall(
  point: Vec2,
  wall: Pick<Wall, "start" | "end">
): PointProjection {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= GEOMETRY_EPSILON * GEOMETRY_EPSILON) {
    return {
      point: { ...wall.start },
      distance: distance(point, wall.start),
      offset: 0,
      t: 0,
    };
  }

  const rawT =
    ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) /
    lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const projected = {
    x: wall.start.x + t * dx,
    y: wall.start.y + t * dy,
  };
  return {
    point: projected,
    distance: distance(point, projected),
    offset: t * Math.sqrt(lengthSquared),
    t,
  };
}

export type SegmentIntersection = {
  point: Vec2;
  tA: number;
  tB: number;
  proper: boolean;
};

export function segmentIntersection(
  aStart: Vec2,
  aEnd: Vec2,
  bStart: Vec2,
  bEnd: Vec2,
  tolerance = GEOMETRY_EPSILON
): SegmentIntersection | null {
  const aDx = aEnd.x - aStart.x;
  const aDy = aEnd.y - aStart.y;
  const bDx = bEnd.x - bStart.x;
  const bDy = bEnd.y - bStart.y;
  const denominator = aDx * bDy - aDy * bDx;

  if (Math.abs(denominator) <= tolerance) {
    return null;
  }

  const deltaX = bStart.x - aStart.x;
  const deltaY = bStart.y - aStart.y;
  const tA = (deltaX * bDy - deltaY * bDx) / denominator;
  const tB = (deltaX * aDy - deltaY * aDx) / denominator;

  if (
    tA < -tolerance ||
    tA > 1 + tolerance ||
    tB < -tolerance ||
    tB > 1 + tolerance
  ) {
    return null;
  }

  return {
    point: {
      x: aStart.x + tA * aDx,
      y: aStart.y + tA * aDy,
    },
    tA,
    tB,
    proper:
      tA > tolerance &&
      tA < 1 - tolerance &&
      tB > tolerance &&
      tB < 1 - tolerance,
  };
}

export function polygonSignedArea(polygon: Vec2[]): number {
  let twiceArea = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return twiceArea / 2;
}

export function polygonArea(polygon: Vec2[]): number {
  return Math.abs(polygonSignedArea(polygon));
}

export function polygonCentroid(polygon: Vec2[]): Vec2 {
  const signedArea = polygonSignedArea(polygon);
  if (Math.abs(signedArea) <= GEOMETRY_EPSILON) {
    const sum = polygon.reduce(
      (result, point) => ({ x: result.x + point.x, y: result.y + point.y }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / Math.max(1, polygon.length),
      y: sum.y / Math.max(1, polygon.length),
    };
  }

  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const cross = current.x * next.y - next.x * current.y;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }
  const divisor = 6 * signedArea;
  return { x: x / divisor, y: y / divisor };
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const current = polygon[currentIndex];
    const previous = polygon[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function snapPointToWallEndpoints(
  point: Vec2,
  walls: Wall[],
  tolerance: number,
  excludedWallId?: string
): Vec2 {
  let closest = point;
  let closestDistance = tolerance;
  for (const wall of walls) {
    if (wall.id === excludedWallId) continue;
    for (const endpoint of [wall.start, wall.end]) {
      const endpointDistance = distance(point, endpoint);
      if (endpointDistance <= closestDistance) {
        closest = endpoint;
        closestDistance = endpointDistance;
      }
    }
  }
  return { ...closest };
}

export function moveConnectedWallEndpoint(
  walls: Wall[],
  wallId: string,
  endpoint: WallEndpoint,
  nextPosition: Vec2,
  tolerance = GEOMETRY_EPSILON
): Wall[] {
  const targetWall = walls.find((wall) => wall.id === wallId);
  if (!targetWall) return walls;
  const previousPosition = targetWall[endpoint];

  return walls.map((wall) => {
    const moveStart = pointsEqual(wall.start, previousPosition, tolerance);
    const moveEnd = pointsEqual(wall.end, previousPosition, tolerance);
    if (!moveStart && !moveEnd) return wall;
    return {
      ...wall,
      start: moveStart ? { ...nextPosition } : wall.start,
      end: moveEnd ? { ...nextPosition } : wall.end,
      source: {
        ...wall.source,
        origin: "manual",
        confirmedByUser: true,
      },
    };
  });
}

export function splitWallAtPoint(
  wall: Wall,
  point: Vec2,
  idFactory: () => string
): [Wall, Wall] | null {
  const projection = projectPointToWall(point, wall);
  if (
    projection.t <= GEOMETRY_EPSILON ||
    projection.t >= 1 - GEOMETRY_EPSILON
  ) {
    return null;
  }

  return [
    {
      ...wall,
      id: idFactory(),
      end: projection.point,
      source: { ...MANUAL_SOURCE },
    },
    {
      ...wall,
      id: idFactory(),
      start: projection.point,
      source: { ...MANUAL_SOURCE },
    },
  ];
}

type GraphVertex = {
  id: string;
  point: Vec2;
  outgoing: HalfEdge[];
};

type HalfEdge = {
  id: string;
  wallId: string;
  from: GraphVertex;
  to: GraphVertex;
  angle: number;
  reverseId: string;
};

function pointKey(point: Vec2, tolerance: number): string {
  return `${Math.round(point.x / tolerance)}:${Math.round(point.y / tolerance)}`;
}

function buildHalfEdgeGraph(
  walls: Wall[],
  tolerance: number
): { vertices: GraphVertex[]; halfEdges: HalfEdge[] } {
  const vertexMap = new Map<string, GraphVertex>();
  const getVertex = (point: Vec2): GraphVertex => {
    const key = pointKey(point, tolerance);
    const existing = vertexMap.get(key);
    if (existing) return existing;
    const vertex = { id: key, point: { ...point }, outgoing: [] };
    vertexMap.set(key, vertex);
    return vertex;
  };

  const halfEdges: HalfEdge[] = [];
  for (const wall of walls) {
    if (wallLength(wall) <= tolerance) continue;
    const start = getVertex(wall.start);
    const end = getVertex(wall.end);
    const forward: HalfEdge = {
      id: `${wall.id}:forward`,
      wallId: wall.id,
      from: start,
      to: end,
      angle: Math.atan2(end.point.y - start.point.y, end.point.x - start.point.x),
      reverseId: `${wall.id}:reverse`,
    };
    const reverse: HalfEdge = {
      id: `${wall.id}:reverse`,
      wallId: wall.id,
      from: end,
      to: start,
      angle: Math.atan2(start.point.y - end.point.y, start.point.x - end.point.x),
      reverseId: `${wall.id}:forward`,
    };
    start.outgoing.push(forward);
    end.outgoing.push(reverse);
    halfEdges.push(forward, reverse);
  }

  for (const vertex of vertexMap.values()) {
    vertex.outgoing.sort((a, b) => a.angle - b.angle);
  }

  return { vertices: [...vertexMap.values()], halfEdges };
}

export type RoomDetectionOptions = {
  tolerance?: number;
  minimumArea?: number;
  idFactory?: () => string;
};

export function detectRoomRegions(
  walls: Wall[],
  options: RoomDetectionOptions = {}
): RoomRegion[] {
  const tolerance = options.tolerance ?? 1;
  const minimumArea = options.minimumArea ?? 100_000;
  let roomSequence = 0;
  const idFactory = options.idFactory ?? (() => `room-${(roomSequence += 1)}`);
  const { halfEdges } = buildHalfEdgeGraph(walls, tolerance);
  const edgeById = new Map(halfEdges.map((edge) => [edge.id, edge]));
  const visited = new Set<string>();
  const rooms: RoomRegion[] = [];

  for (const startingEdge of halfEdges) {
    if (visited.has(startingEdge.id)) continue;
    const polygon: Vec2[] = [];
    const wallIds: string[] = [];
    let current: HalfEdge | undefined = startingEdge;
    const localVisited = new Set<string>();
    let closed = false;

    while (current && !localVisited.has(current.id)) {
      localVisited.add(current.id);
      visited.add(current.id);
      polygon.push(current.from.point);
      wallIds.push(current.wallId);

      const outgoing = current.to.outgoing;
      const reverseIndex = outgoing.findIndex(
        (candidate) => candidate.id === current?.reverseId
      );
      if (reverseIndex < 0 || outgoing.length === 0) break;
      const nextIndex = (reverseIndex - 1 + outgoing.length) % outgoing.length;
      current = edgeById.get(outgoing[nextIndex].id);
      if (current?.id === startingEdge.id) {
        closed = true;
        break;
      }
    }

    if (!closed || polygon.length < 3) continue;
    const signedArea = polygonSignedArea(polygon);
    // Canvas coordinates grow downward. With the half-edge traversal above,
    // bounded faces have a positive signed area and the exterior face is negative.
    if (signedArea <= minimumArea) continue;

    rooms.push({
      id: idFactory(),
      name: `방 ${rooms.length + 1}`,
      polygon: polygon.map((point) => ({ ...point })),
      wallIds: [...new Set(wallIds)],
      usage: "other",
      source: { ...MANUAL_SOURCE },
    });
  }

  return rooms.sort(
    (a, b) =>
      polygonCentroid(a.polygon).y - polygonCentroid(b.polygon).y ||
      polygonCentroid(a.polygon).x - polygonCentroid(b.polygon).x
  );
}

function duplicateWallKey(wall: Wall, tolerance: number): string {
  const startKey = pointKey(wall.start, tolerance);
  const endKey = pointKey(wall.end, tolerance);
  return [startKey, endKey].sort().join("|");
}

function openingIssues(opening: Opening, walls: Wall[]): StructureIssue[] {
  const wall = walls.find((candidate) => candidate.id === opening.wallId);
  if (!wall) {
    return [
      {
        id: `opening-wall-missing:${opening.id}`,
        code: "opening-wall-missing",
        severity: "error",
        message: "문 또는 창문이 존재하지 않는 벽을 참조합니다.",
        entityIds: [opening.id, opening.wallId],
      },
    ];
  }
  if (opening.offset < 0 || opening.offset + opening.width > wallLength(wall)) {
    return [
      {
        id: `opening-out-of-bounds:${opening.id}`,
        code: "opening-out-of-bounds",
        severity: "error",
        message: "문 또는 창문이 벽 범위를 벗어났습니다.",
        entityIds: [opening.id, opening.wallId],
        position: pointAlongWall(wall, Math.max(0, opening.offset)),
      },
    ];
  }
  return [];
}

export function validateStructure(
  structure: Pick<FloorStructure, "walls" | "openings" | "rooms">,
  tolerance = 1
): StructureIssue[] {
  const issues: StructureIssue[] = [];
  const duplicateKeys = new Map<string, string>();
  const endpointDegree = new Map<string, { point: Vec2; wallIds: string[] }>();

  for (const wall of structure.walls) {
    const length = wallLength(wall);
    if (length < MIN_WALL_LENGTH) {
      issues.push({
        id: `wall-too-short:${wall.id}`,
        code: "wall-too-short",
        severity: "error",
        message: `벽 길이가 ${MIN_WALL_LENGTH}mm보다 짧습니다.`,
        entityIds: [wall.id],
        position: wall.start,
      });
    }
    if (pointsEqual(wall.start, wall.end, tolerance)) {
      issues.push({
        id: `wall-self-loop:${wall.id}`,
        code: "wall-self-loop",
        severity: "error",
        message: "벽의 시작점과 끝점이 같습니다.",
        entityIds: [wall.id],
        position: wall.start,
      });
    }

    const duplicateKey = duplicateWallKey(wall, tolerance);
    const duplicateOf = duplicateKeys.get(duplicateKey);
    if (duplicateOf) {
      issues.push({
        id: `duplicate-wall:${duplicateOf}:${wall.id}`,
        code: "duplicate-wall",
        severity: "error",
        message: "같은 위치에 중복된 벽이 있습니다.",
        entityIds: [duplicateOf, wall.id],
        position: wall.start,
      });
    } else {
      duplicateKeys.set(duplicateKey, wall.id);
    }

    for (const point of [wall.start, wall.end]) {
      const key = pointKey(point, tolerance);
      const degree = endpointDegree.get(key) ?? { point, wallIds: [] };
      degree.wallIds.push(wall.id);
      endpointDegree.set(key, degree);
    }
  }

  for (let firstIndex = 0; firstIndex < structure.walls.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < structure.walls.length;
      secondIndex += 1
    ) {
      const first = structure.walls[firstIndex];
      const second = structure.walls[secondIndex];
      const intersection = segmentIntersection(
        first.start,
        first.end,
        second.start,
        second.end
      );
      if (intersection?.proper) {
        issues.push({
          id: `wall-crossing:${first.id}:${second.id}`,
          code: "wall-crossing",
          severity: "error",
          message: "분할되지 않은 벽이 서로 교차합니다.",
          entityIds: [first.id, second.id],
          position: intersection.point,
        });
      }
    }
  }

  for (const endpoint of endpointDegree.values()) {
    if (endpoint.wallIds.length === 1) {
      issues.push({
        id: `dangling-endpoint:${endpoint.wallIds[0]}:${pointKey(
          endpoint.point,
          tolerance
        )}`,
        code: "dangling-endpoint",
        severity: "warning",
        message: "다른 벽과 연결되지 않은 끝점이 있습니다.",
        entityIds: endpoint.wallIds,
        position: endpoint.point,
      });
    }
  }

  for (const opening of structure.openings) {
    issues.push(...openingIssues(opening, structure.walls));
  }

  if (structure.walls.length >= 3 && structure.rooms.length === 0) {
    issues.push({
      id: "room-not-closed:structure",
      code: "room-not-closed",
      severity: "warning",
      message: "닫힌 방 영역을 찾을 수 없습니다.",
      entityIds: structure.walls.map((wall) => wall.id),
    });
  }

  return issues;
}
