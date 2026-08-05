import type { CalibrationAnchor, FloorPlanTransform } from "./types";

export function pixelDistance(anchor: Pick<CalibrationAnchor, "startPixel" | "endPixel">): number {
  return Math.hypot(
    anchor.endPixel.x - anchor.startPixel.x,
    anchor.endPixel.y - anchor.startPixel.y
  );
}

export function calculateScaleMmPerPixel(anchor: CalibrationAnchor): number {
  const pixels = pixelDistance(anchor);
  if (!Number.isFinite(pixels) || pixels <= 0) {
    throw new Error("축척 기준점의 픽셀 거리는 0보다 커야 합니다.");
  }
  if (!Number.isFinite(anchor.realLengthMm) || anchor.realLengthMm <= 0) {
    throw new Error("실제 길이는 0보다 커야 합니다.");
  }
  return anchor.realLengthMm / pixels;
}

export function averageCalibrationScale(anchors: CalibrationAnchor[]): number | null {
  if (anchors.length === 0) return null;
  const scales = anchors.map(calculateScaleMmPerPixel);
  return scales.reduce((sum, scale) => sum + scale, 0) / scales.length;
}

export function imagePointToWorld(
  point: { x: number; y: number },
  transform: FloorPlanTransform
): { x: number; y: number } {
  if (transform.scaleMmPerPixel === null) {
    throw new Error("평면도 축척이 아직 설정되지 않았습니다.");
  }
  const radians = (transform.rotation * Math.PI) / 180;
  const scaledX = point.x * transform.scaleMmPerPixel;
  const scaledY = point.y * transform.scaleMmPerPixel;
  return {
    x:
      transform.x +
      scaledX * Math.cos(radians) -
      scaledY * Math.sin(radians),
    y:
      transform.y +
      scaledX * Math.sin(radians) +
      scaledY * Math.cos(radians),
  };
}

export function worldPointToImage(
  point: { x: number; y: number },
  transform: FloorPlanTransform
): { x: number; y: number } {
  if (transform.scaleMmPerPixel === null) {
    throw new Error("평면도 축척이 아직 설정되지 않았습니다.");
  }
  const radians = (-transform.rotation * Math.PI) / 180;
  const translatedX = point.x - transform.x;
  const translatedY = point.y - transform.y;
  return {
    x:
      (translatedX * Math.cos(radians) -
        translatedY * Math.sin(radians)) /
      transform.scaleMmPerPixel,
    y:
      (translatedX * Math.sin(radians) +
        translatedY * Math.cos(radians)) /
      transform.scaleMmPerPixel,
  };
}
