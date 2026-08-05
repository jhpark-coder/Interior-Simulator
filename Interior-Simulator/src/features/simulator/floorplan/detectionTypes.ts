import type { Vec2 } from "../domain/structure";

export type RawDetectedLine = {
  id: string;
  orientation: "horizontal" | "vertical";
  start: Vec2;
  end: Vec2;
  confidence: number;
  thicknessPx: number;
};

export type RawDetectedOpening = {
  id: string;
  orientation: "horizontal" | "vertical";
  center: Vec2;
  widthPx: number;
  confidence: number;
  suggestedKind: "door" | "window";
};

export type RawDetectedLabel = {
  id: string;
  text: string;
  center: Vec2;
  confidence: number;
};

export type RawDetectionResult = {
  width: number;
  height: number;
  threshold: number;
  estimatedSkewDegrees: number;
  lines: RawDetectedLine[];
  openings: RawDetectedOpening[];
  labels: RawDetectedLabel[];
  elapsedMs: number;
};

export type DetectionCandidateStatus = "pending" | "accepted" | "rejected";

type CandidateBase = {
  id: string;
  confidence: number;
  status: DetectionCandidateStatus;
  appliedEntityId?: string;
};

export type WallCandidate = CandidateBase & {
  kind: "wall";
  start: Vec2;
  end: Vec2;
  thickness: number;
};

export type OpeningCandidate = CandidateBase & {
  kind: "opening";
  position: Vec2;
  width: number;
  suggestedKind: "door" | "window";
};

export type LabelCandidate = CandidateBase & {
  kind: "label";
  position: Vec2;
  text: string;
};

export type DetectionCandidate =
  | WallCandidate
  | OpeningCandidate
  | LabelCandidate;

export type DetectionRunSummary = {
  id: string;
  sourceId: string;
  createdAt: string;
  elapsedMs: number;
  threshold: number;
  estimatedSkewDegrees: number;
  wallCandidateCount: number;
  openingCandidateCount: number;
  labelCandidateCount: number;
  calibrated: boolean;
};
