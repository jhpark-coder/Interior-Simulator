import type { Vec2, Wall } from "../structure";

export type FloorPlanMimeType = "image/jpeg" | "image/png" | "application/pdf";

export type CalibrationAnchor = {
  id: string;
  startPixel: Vec2;
  endPixel: Vec2;
  realLengthMm: number;
};

export type FloorPlanTransform = {
  x: number;
  y: number;
  rotation: number;
  scaleMmPerPixel: number | null;
};

export type FloorPlanAdjustments = {
  brightness: number;
  contrast: number;
  threshold: number | null;
  grayscale: boolean;
};

/** 원본 이미지 픽셀 좌표의 표시·인식 영역. 원본 파일과 축척 기준점은 바꾸지 않는다. */
export type FloorPlanCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FloorPlanSource = {
  id: string;
  fileName: string;
  mimeType: FloorPlanMimeType;
  assetId: string;
  originalAssetId?: string;
  pageNumber?: number;
  widthPx: number;
  heightPx: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  transform: FloorPlanTransform;
  adjustments: FloorPlanAdjustments;
  crop?: FloorPlanCrop;
  calibrationAnchors: CalibrationAnchor[];
};

export type DetectionStatus = "candidate" | "accepted" | "rejected";

export type WallDetectionCandidate = {
  id: string;
  wall: Wall;
  confidence: number;
  status: DetectionStatus;
};

export type DetectionSession = {
  id: string;
  sourceId: string;
  createdAt: string;
  algorithmVersion: string;
  candidates: WallDetectionCandidate[];
};
