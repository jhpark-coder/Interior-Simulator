import type { Vec2 } from "../structure";

export type MemoryPin = {
  id: string;
  roomId?: string;
  position: Vec2;
  cameraDirection?: number;
  title: string;
  note: string;
  assetIds: string[];
  capturedAt?: string;
  temporalState: "past" | "current" | "planned";
  createdAt: string;
  updatedAt: string;
};

export type SavedViewpoint = {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
  createdAt: string;
};
