import type { Vec2 } from "../structure";
import type { FloorPlanCrop, FloorPlanSource } from "./types";

/** 이보다 작은 자르기 영역은 실수로 두 번 클릭한 것으로 보고 받지 않는다(px). */
export const MIN_CROP_SIZE_PX = 20;

/**
 * 원본 이미지 픽셀 좌표의 두 모서리로 자르기 영역을 만든다. 이미지 밖은 잘라 내고
 * 정수 픽셀로 맞춘다. 남는 영역이 너무 작으면 null이다.
 */
export function cropFromCorners(
  a: Vec2,
  b: Vec2,
  widthPx: number,
  heightPx: number
): FloorPlanCrop | null {
  const left = Math.max(0, Math.floor(Math.min(a.x, b.x)));
  const top = Math.max(0, Math.floor(Math.min(a.y, b.y)));
  const right = Math.min(widthPx, Math.ceil(Math.max(a.x, b.x)));
  const bottom = Math.min(heightPx, Math.ceil(Math.max(a.y, b.y)));
  if (right - left < MIN_CROP_SIZE_PX || bottom - top < MIN_CROP_SIZE_PX) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** 저장된 자르기 영역을 이미지 안으로 맞춘다. 맞출 수 없으면 null(자르지 않음)이다. */
export function clampCrop(
  crop: FloorPlanCrop,
  widthPx: number,
  heightPx: number
): FloorPlanCrop | null {
  return cropFromCorners(
    { x: crop.x, y: crop.y },
    { x: crop.x + crop.width, y: crop.y + crop.height },
    widthPx,
    heightPx
  );
}

/** 화면과 자동 인식에 쓰는 영역. 자르지 않았으면 이미지 전체다. */
export function visibleImageRect(
  source: Pick<FloorPlanSource, "widthPx" | "heightPx" | "crop">
): FloorPlanCrop {
  return source.crop ?? { x: 0, y: 0, width: source.widthPx, height: source.heightPx };
}
