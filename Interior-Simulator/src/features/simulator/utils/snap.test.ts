import { describe, it, expect } from "vitest";
import { snapToGrid, snapPosition } from "./snap";
import type { Room } from "../types";

describe("snap utilities", () => {
  describe("snapToGrid", () => {
    it("should snap values to the nearest grid line", () => {
      expect(snapToGrid(0, 100)).toBe(0);
      expect(snapToGrid(50, 100)).toBe(100);
      expect(snapToGrid(49, 100)).toBe(0);
      expect(snapToGrid(150, 100)).toBe(200);
      expect(snapToGrid(125, 100)).toBe(100);
    });

    it("should handle different grid sizes", () => {
      expect(snapToGrid(75, 50)).toBe(100);
      expect(snapToGrid(24, 50)).toBe(0);
      expect(snapToGrid(26, 50)).toBe(50);
    });
  });

  describe("snapPosition", () => {
    const room: Room = {
      width: 4000,
      height: 3000,
      wallThickness: 200,
      ceilingHeight: 2400,
      gridSize: 100,
      snapEnabled: true,
      displayUnit: "mm",
    };

    it("should snap position when snap is enabled", () => {
      const result = snapPosition(125, 175, room);
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it("should not snap position when snap is disabled", () => {
      const disabledRoom = { ...room, snapEnabled: false };
      const result = snapPosition(125, 175, disabledRoom);
      expect(result.x).toBe(125);
      expect(result.y).toBe(175);
    });
  });
});
