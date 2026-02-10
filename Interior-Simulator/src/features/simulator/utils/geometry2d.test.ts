import { describe, it, expect } from "vitest";
import {
  degToRad,
  radToDeg,
  getRotatedBounds,
  constrainToRoom,
  checkFurnitureCollision,
  getPolygonIntersection,
  getCollisionPolygons,
} from "./geometry2d";
import type { FurnitureItem, Room } from "../types";

function createItem(
  id: string,
  x: number,
  y: number,
  width: number,
  depth: number,
  rotation = 0
): FurnitureItem {
  return {
    id,
    type: "desk",
    category: "furniture",
    name: "Desk",
    x,
    y,
    width,
    depth,
    height: 720,
    rotation,
    zIndex: 0,
    locked: false,
  };
}

describe("geometry2d utilities", () => {
  describe("degToRad and radToDeg", () => {
    it("should convert degrees to radians", () => {
      expect(degToRad(0)).toBe(0);
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    it("should convert radians to degrees", () => {
      expect(radToDeg(0)).toBe(0);
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
    });
  });

  describe("getRotatedBounds", () => {
    it("should return correct bounds for non-rotated furniture", () => {
      const item: FurnitureItem = {
        id: "1",
        type: "desk",
        category: "furniture",
        name: "Desk",
        x: 100,
        y: 100,
        width: 200,
        depth: 100,
        height: 720,
        rotation: 0,
        zIndex: 0,
        locked: false,
      };

      const bounds = getRotatedBounds(item);
      expect(bounds.minX).toBe(100);
      expect(bounds.minY).toBe(100);
      expect(bounds.maxX).toBe(300);
      expect(bounds.maxY).toBe(200);
    });

    it("should return correct bounds for rotated furniture", () => {
      const item: FurnitureItem = {
        id: "1",
        type: "desk",
        category: "furniture",
        name: "Desk",
        x: 100,
        y: 100,
        width: 200,
        depth: 100,
        height: 720,
        rotation: 90,
        zIndex: 0,
        locked: false,
      };

      const bounds = getRotatedBounds(item);
      // After center-based 90 degree rotation, width and depth swap around center.
      expect(bounds.minX).toBeCloseTo(150, 1);
      expect(bounds.minY).toBeCloseTo(50, 1);
      expect(bounds.maxX).toBeCloseTo(250, 1);
      expect(bounds.maxY).toBeCloseTo(250, 1);
    });
  });

  describe("constrainToRoom", () => {
    const room: Room = {
      width: 4000,
      height: 3000,
      wallThickness: 200,
      ceilingHeight: 2400,
      gridSize: 100,
      snapEnabled: true,
      displayUnit: "mm",
    };

    it("should not modify position if furniture is within bounds", () => {
      const item: FurnitureItem = {
        id: "1",
        type: "desk",
        category: "furniture",
        name: "Desk",
        x: 1000,
        y: 1000,
        width: 200,
        depth: 100,
        height: 720,
        rotation: 0,
        zIndex: 0,
        locked: false,
      };

      const result = constrainToRoom(item, room);
      expect(result.x).toBe(1000);
      expect(result.y).toBe(1000);
    });

    it("should constrain furniture that exceeds room boundaries", () => {
      const item: FurnitureItem = {
        id: "1",
        type: "desk",
        category: "furniture",
        name: "Desk",
        x: -50,
        y: -50,
        width: 200,
        depth: 100,
        height: 720,
        rotation: 0,
        zIndex: 0,
        locked: false,
      };

      const result = constrainToRoom(item, room);
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe("collision geometry", () => {
    it("should detect overlap and return a non-empty intersection polygon", () => {
      const item1 = createItem("1", 100, 100, 200, 120);
      const item2 = createItem("2", 250, 140, 180, 120);

      expect(checkFurnitureCollision(item1, item2)).toBe(true);

      const intersection = getPolygonIntersection(item1, item2);
      expect(intersection.length).toBeGreaterThanOrEqual(3);

      const xs = intersection.map((p) => p.x);
      const ys = intersection.map((p) => p.y);
      expect(Math.min(...xs)).toBeCloseTo(250);
      expect(Math.max(...xs)).toBeCloseTo(300);
      expect(Math.min(...ys)).toBeCloseTo(140);
      expect(Math.max(...ys)).toBeCloseTo(220);
    });

    it("should return collision polygons only for overlapping furniture", () => {
      const pending = createItem("pending", 100, 100, 200, 120);
      const overlapping = createItem("2", 250, 140, 180, 120);
      const separate = createItem("3", 600, 600, 180, 120);

      const polygons = getCollisionPolygons(pending, [overlapping, separate]);
      expect(polygons).toHaveLength(1);
      expect(polygons[0].length).toBeGreaterThanOrEqual(3);
    });
  });
});
