import {
  doorLeafDirection,
  doorSwingGeometry,
  inwardNormal,
  pointAlongWall,
  resolvedDoorDetails,
  slidingDoorDirection,
  type FloorStructure,
  type Opening,
  type Vec2,
  type Wall,
} from "../domain/structure";
import type { FurnitureItem } from "../types";
import { checkCornersCollision, getRotatedCorners } from "./geometry2d";

// 문짝을 이 간격으로 움직이며 가구와 닿는지 본다. 900mm 문의 끝에서 0.5°는 약 8mm다.
const SWING_STEP_DEGREES = 0.5;
const SLIDE_STEP_MM = 10;
// 3D 미닫이문 문짝과 같은 위치(벽면에서 살짝 띄움)와 이동 거리.
const SLIDING_FACE_GAP = 4;
const SLIDING_TRAVEL_RATIO = 0.9;

export type DoorClearance = {
  openingId: string;
  doorType: "swing" | "sliding";
  /** 가구에 닿기 전까지 열 수 있는 비율. 1이면 끝까지 열린다. */
  clearFraction: number;
  /** 여닫이문이 실제로 열리는 각도(도). 미닫이문은 null. */
  clearAngle: number | null;
  /** 문짝이 움직이는 범위에 걸리는 가구. */
  blockingFurnitureIds: string[];
};

function leafRectangle(start: Vec2, direction: Vec2, length: number, thickness: number): Vec2[] {
  const half = thickness / 2;
  const side = { x: -direction.y * half, y: direction.x * half };
  const end = { x: start.x + direction.x * length, y: start.y + direction.y * length };
  return [
    { x: start.x + side.x, y: start.y + side.y },
    { x: end.x + side.x, y: end.y + side.y },
    { x: end.x - side.x, y: end.y - side.y },
    { x: start.x - side.x, y: start.y - side.y },
  ];
}

/** 문짝이 0(닫힘)부터 1(설정한 만큼 열림)까지 움직일 때의 문짝 사각형. */
function leafAt(opening: Opening, wall: Wall, structure: FloorStructure) {
  const details = resolvedDoorDetails(opening);
  if (details.doorType === "swing") {
    const geometry = doorSwingGeometry(opening, wall, structure);
    return {
      doorType: "swing" as const,
      steps: Math.max(1, Math.ceil(geometry.openAngle / SWING_STEP_DEGREES)),
      reach: geometry.radius,
      origin: geometry.hinge,
      polygon: (fraction: number) =>
        leafRectangle(
          geometry.hinge,
          doorLeafDirection(geometry, geometry.openAngle * fraction),
          geometry.radius,
          details.thickness
        ),
      angle: (fraction: number) => geometry.openAngle * fraction,
    };
  }
  const inward = inwardNormal(opening, wall, structure);
  const along = slidingDoorDirection(opening, wall);
  const faceOffset = wall.thickness / 2 + details.thickness / 2 + SLIDING_FACE_GAP;
  const travel = opening.width * SLIDING_TRAVEL_RATIO;
  const start = pointAlongWall(wall, opening.offset);
  const end = pointAlongWall(wall, opening.offset + opening.width);
  const direction = { x: end.x - start.x, y: end.y - start.y };
  const length = Math.hypot(direction.x, direction.y) || 1;
  const unit = { x: direction.x / length, y: direction.y / length };
  return {
    doorType: "sliding" as const,
    steps: Math.max(1, Math.ceil(travel / SLIDE_STEP_MM)),
    reach: opening.width + travel + faceOffset,
    origin: start,
    polygon: (fraction: number) =>
      leafRectangle(
        {
          x: start.x + inward.x * faceOffset + along.x * travel * fraction,
          y: start.y + inward.y * faceOffset + along.y * travel * fraction,
        },
        unit,
        opening.width,
        details.thickness
      ),
    angle: () => null,
  };
}

/**
 * 문마다 문짝이 움직이는 범위에 걸리는 가구와, 가구에 닿기 전까지 열 수 있는 정도를
 * 구한다. 여닫이는 경첩을 기준으로 돌고, 미닫이는 방 쪽 벽면을 따라 미끄러진다.
 */
export function doorClearances(
  structure: FloorStructure,
  furniture: FurnitureItem[]
): DoorClearance[] {
  const wallById = new Map(structure.walls.map((wall) => [wall.id, wall]));
  const furnitureCorners = furniture.map((item) => ({ item, corners: getRotatedCorners(item) }));

  return structure.openings.flatMap((opening) => {
    const wall = wallById.get(opening.wallId);
    if (opening.kind !== "door" || !wall) return [];
    const leaf = leafAt(opening, wall, structure);
    // 문짝이 닿을 수 없을 만큼 먼 가구는 미리 뺀다. 가구를 감싸는 원으로 보수적으로 판단한다.
    const thickness = resolvedDoorDetails(opening).thickness;
    const nearby = furnitureCorners.filter(({ item }) => {
      const center = { x: item.x + item.width / 2, y: item.y + item.depth / 2 };
      const radius = Math.hypot(item.width, item.depth) / 2;
      return (
        Math.hypot(center.x - leaf.origin.x, center.y - leaf.origin.y) - radius <=
        leaf.reach + thickness
      );
    });

    const blocking = new Set<string>();
    let clearFraction = 1;
    for (let step = 0; step <= leaf.steps; step += 1) {
      const fraction = step / leaf.steps;
      const polygon = leaf.polygon(fraction);
      for (const { item, corners } of nearby) {
        if (blocking.has(item.id) || !checkCornersCollision(polygon, corners)) continue;
        if (blocking.size === 0) clearFraction = Math.max(0, (step - 1) / leaf.steps);
        blocking.add(item.id);
      }
    }

    return [
      {
        openingId: opening.id,
        doorType: leaf.doorType,
        clearFraction,
        clearAngle: leaf.angle(clearFraction),
        blockingFurnitureIds: [...blocking],
      },
    ];
  });
}
