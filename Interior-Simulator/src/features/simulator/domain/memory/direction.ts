import type { MemoryPin } from "./types";

/**
 * 기록 핀의 촬영 방향(도)을 평면의 단위 벡터로 바꾼다. 0°는 도면 위쪽(-y),
 * 90°는 오른쪽(+x)인 나침반 방향이다. 3D 시점 저장과 2D·3D 방향 표시가 같이 쓴다.
 */
export function cameraDirectionVector(degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
}

/** 사진이 있거나 선택된 핀만 촬영 방향을 그린다. 사진 없는 핀의 기본값 0°는 의미가 없다. */
export function showsCameraDirection(pin: MemoryPin, selected: boolean): boolean {
  return selected || pin.assetIds.length > 0;
}

// 사진이 담는 범위를 나타내는 2D 부채꼴 각도.
export const CAMERA_FOV_DEGREES = 60;

/** Konva Wedge의 시작 각도(화면 기준 시계 방향). 부채꼴 가운데가 촬영 방향을 향한다. */
export function cameraWedgeRotation(directionDegrees: number): number {
  const direction = cameraDirectionVector(directionDegrees);
  const center = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
  return center - CAMERA_FOV_DEGREES / 2;
}
