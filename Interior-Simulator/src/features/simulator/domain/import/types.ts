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
