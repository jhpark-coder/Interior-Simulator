import { segmentIntersection, type FloorStructure, type Vec2 } from "../domain/structure";
import type { FurnitureItem } from "../types";
import { getRotatedCorners } from "./geometry2d";
import { solidWallSegments } from "./scenarioValidation";

/** 이보다 좁으면 사람이 지나가기 어렵다(mm). */
export const WALKWAY_BLOCKED_WIDTH = 600;
/** 이보다 좁으면 지나갈 수는 있어도 좁다(mm). */
export const WALKWAY_COMFORT_WIDTH = 900;
/** 이보다 좁은 틈은 붙여 놓은 것으로 보고 통로로 표시하지 않는다(mm). */
export const WALKWAY_FLUSH_GAP = 150;

export type WalkwayGap = {
  /** 틈의 양 끝(가장 가까운 두 점). */
  from: Vec2;
  to: Vec2;
  width: number;
  severity: "blocked" | "narrow";
  furnitureIds: string[];
};

type Closest = { from: Vec2; to: Vec2; distance: number };

function closestPointOnSegment(point: Vec2, start: Vec2, end: Vec2): Vec2 {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return start;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)
  );
  return { x: start.x + dx * t, y: start.y + dy * t };
}

function edges(polygon: Vec2[]): Array<[Vec2, Vec2]> {
  return polygon.map((point, index) => [point, polygon[(index + 1) % polygon.length]]);
}

/** 겹치지 않는 두 볼록 다각형(또는 선분)의 가장 가까운 두 점. */
function closestBetween(a: Vec2[], b: Vec2[]): Closest {
  let best: Closest = { from: a[0], to: b[0], distance: Number.POSITIVE_INFINITY };
  const consider = (from: Vec2, to: Vec2) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < best.distance) best = { from, to, distance };
  };
  const edgesOf = (polygon: Vec2[]) =>
    polygon.length === 2 ? [[polygon[0], polygon[1]] as [Vec2, Vec2]] : edges(polygon);
  for (const point of a) {
    for (const [start, end] of edgesOf(b))
      consider(point, closestPointOnSegment(point, start, end));
  }
  for (const point of b) {
    for (const [start, end] of edgesOf(a))
      consider(closestPointOnSegment(point, start, end), point);
  }
  return best;
}

const JOINT_TOLERANCE = 1;

function samePoint(a: Vec2, b: Vec2): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= JOINT_TOLERANCE;
}

function severityOf(width: number): WalkwayGap["severity"] | null {
  if (width < WALKWAY_FLUSH_GAP || width >= WALKWAY_COMFORT_WIDTH) return null;
  return width < WALKWAY_BLOCKED_WIDTH ? "blocked" : "narrow";
}

/**
 * 가구와 가구, 가구와 벽면 사이의 좁은 통로. 붙여 놓은 틈(150mm 미만)과 넉넉한 틈
 * (900mm 이상)은 빼고, 사이에 벽이 있는 가구끼리는 통로로 보지 않는다. 다른 가구에
 * 붙은 물건(parentId)은 계산에서 뺀다. 벽 끝까지의 거리는 문틀처럼 혼자 끝나는 벽만 잰다.
 */
export function findNarrowWalkways(
  furniture: FurnitureItem[],
  structure: FloorStructure
): WalkwayGap[] {
  const walls = solidWallSegments(structure);
  // 책상 위 모니터처럼 다른 가구에 붙은 물건은 바닥 통로를 막지 않는다.
  const polygons = furniture
    .filter((item) => !item.parentId)
    .map((item) => ({ item, corners: getRotatedCorners(item) }));
  const gaps: WalkwayGap[] = [];

  for (let i = 0; i < polygons.length; i += 1) {
    for (let j = i + 1; j < polygons.length; j += 1) {
      const a = polygons[i];
      const b = polygons[j];
      const closest = closestBetween(a.corners, b.corners);
      const severity = severityOf(closest.distance);
      if (!severity) continue;
      const blockedByWall = walls.some(
        (wall) => segmentIntersection(closest.from, closest.to, wall.start, wall.end) !== null
      );
      if (blockedByWall) continue;
      gaps.push({
        from: closest.from,
        to: closest.to,
        width: closest.distance,
        severity,
        furnitureIds: [a.item.id, b.item.id],
      });
    }
  }

  // 다른 벽과 만나는 벽 끝. 이 점까지의 대각선 거리는 만나는 벽의 벽면 거리와 겹친다.
  const isJoint = (point: Vec2, self: (typeof walls)[number]) =>
    walls.some(
      (other) =>
        other !== self && samePoint(point, closestPointOnSegment(point, other.start, other.end))
    );

  for (const { item, corners } of polygons) {
    for (const wall of walls) {
      const closest = closestBetween(corners, [wall.start, wall.end]);
      const half = wall.wall.thickness / 2;
      const width = closest.distance - half;
      const severity = severityOf(width);
      if (!severity || closest.distance === 0) continue;
      // 문틀처럼 혼자 끝나는 벽 끝은 남기고, 모서리·T자 접합부는 뺀다.
      const atEnd = samePoint(closest.to, wall.start) || samePoint(closest.to, wall.end);
      if (atEnd && isJoint(closest.to, wall)) continue;
      // 벽 쪽 끝을 벽 중심선에서 벽면으로 옮긴다.
      const ratio = half / closest.distance;
      gaps.push({
        from: closest.from,
        to: {
          x: closest.to.x + (closest.from.x - closest.to.x) * ratio,
          y: closest.to.y + (closest.from.y - closest.to.y) * ratio,
        },
        width,
        severity,
        furnitureIds: [item.id],
      });
    }
  }
  return gaps;
}
