import type { FloorStructure, Opening, Vec2, Wall } from "./types";
import { pointAlongWall, pointInPolygon, wallDirection, wallNormal } from "./geometry";
import { OPENING_ANGLE_RANGE } from "./limits";

export const DEFAULT_DOOR_OPEN_ANGLE = 90;
export const MAX_DOOR_OPEN_ANGLE = OPENING_ANGLE_RANGE.max;
export const DEFAULT_DOOR_THICKNESS = 40;

// 벽 면에서 이만큼 떨어진 점이 어느 방 안에 있는지로 벽의 '방 쪽'을 판단한다.
const ROOM_SIDE_PROBE_MM = 100;

/** 탐지 후보 승인처럼 세부값 없이 만들어진 문도 같은 기본값으로 다룬다. */
export function resolvedDoorDetails(opening: Opening) {
  return {
    doorType: opening.doorType ?? "swing",
    hinge: opening.hinge ?? "left",
    swing: opening.swing ?? "inward",
    slideDirection: opening.slideDirection ?? "right",
    openAngle: Math.min(
      MAX_DOOR_OPEN_ANGLE,
      Math.max(0, opening.openAngle ?? DEFAULT_DOOR_OPEN_ANGLE)
    ),
    thickness: opening.thickness ?? DEFAULT_DOOR_THICKNESS,
  } as const;
}

/**
 * 문이 '안쪽(inward)'으로 열릴 때의 벽 법선. 한쪽만 방이면(외벽 등) 그 방 쪽이고,
 * 양쪽이 모두 방이거나 모두 아니면(내벽, 방 미계산) 벽 진행 방향의 왼쪽 법선이다.
 * 구형 LayoutDoc의 inward(방 안쪽)와 같은 뜻이 되도록 방 위치로 판단한다.
 */
export function inwardNormal(opening: Opening, wall: Wall, structure: FloorStructure): Vec2 {
  const normal = wallNormal(wall);
  const center = pointAlongWall(wall, opening.offset + opening.width / 2);
  const reach = wall.thickness / 2 + ROOM_SIDE_PROBE_MM;
  const insideRoom = (side: 1 | -1) => {
    const probe = {
      x: center.x + normal.x * reach * side,
      y: center.y + normal.y * reach * side,
    };
    return structure.rooms.some((room) => pointInPolygon(probe, room.polygon));
  };
  const front = insideRoom(1);
  const back = insideRoom(-1);
  if (!front && back) return { x: -normal.x, y: -normal.y };
  return normal;
}

export type DoorSwingGeometry = {
  /** 경첩 위치(벽 중심선 위, mm). */
  hinge: Vec2;
  /** 닫힌 문짝이 경첩에서 뻗는 단위 방향. */
  closedDirection: Vec2;
  /** 문이 열리는 쪽 단위 법선. closedDirection과 직교한다. */
  swingSide: Vec2;
  /** 문짝 길이(= 개구부 너비). */
  radius: number;
  /** 저장된 개폐 각도(도). */
  openAngle: number;
};

/**
 * 여닫이문의 경첩·열림 방향. hinge "left"는 벽 시작점 쪽 끝, "right"는 끝점 쪽 끝이다.
 * 구형 LayoutDoc을 변환한 벽은 왼쪽→오른쪽, 위→아래로 놓이므로 구형의 왼쪽/오른쪽 경첩과
 * 같은 위치가 된다.
 */
export function doorSwingGeometry(
  opening: Opening,
  wall: Wall,
  structure: FloorStructure
): DoorSwingGeometry {
  const details = resolvedDoorDetails(opening);
  const direction = wallDirection(wall);
  const atStart = details.hinge === "left";
  const hinge = pointAlongWall(wall, atStart ? opening.offset : opening.offset + opening.width);
  const closedDirection = atStart ? direction : { x: -direction.x, y: -direction.y };
  const inward = inwardNormal(opening, wall, structure);
  const swingSide = details.swing === "inward" ? inward : { x: -inward.x, y: -inward.y };
  return {
    hinge,
    closedDirection,
    swingSide,
    radius: opening.width,
    openAngle: details.openAngle,
  };
}

/** 경첩에서 angleDegrees만큼 연 문짝의 끝이 가리키는 단위 방향. */
export function doorLeafDirection(geometry: DoorSwingGeometry, angleDegrees: number): Vec2 {
  const radians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: geometry.closedDirection.x * cos + geometry.swingSide.x * sin,
    y: geometry.closedDirection.y * cos + geometry.swingSide.y * sin,
  };
}

/** 닫힘(0°)부터 openAngle까지 문짝 끝이 그리는 호의 점들. */
export function doorSwingArc(geometry: DoorSwingGeometry, steps = 24): Vec2[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const direction = doorLeafDirection(geometry, (geometry.openAngle * index) / steps);
    return {
      x: geometry.hinge.x + direction.x * geometry.radius,
      y: geometry.hinge.y + direction.y * geometry.radius,
    };
  });
}

/**
 * 미닫이문이 열릴 때 문짝이 움직이는 벽 방향 단위 벡터. "left"는 벽 시작점 쪽,
 * "right"는 끝점 쪽이다.
 */
export function slidingDoorDirection(opening: Opening, wall: Wall): Vec2 {
  const direction = wallDirection(wall);
  return resolvedDoorDetails(opening).slideDirection === "left"
    ? { x: -direction.x, y: -direction.y }
    : direction;
}
