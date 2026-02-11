import { describe, it, expect } from "vitest";
import {
  getWallLength,
  isOpeningInBounds,
  constrainOpeningOffset,
  doOpeningsOverlap,
  validateDoorPlacement,
  validateWindowPlacement,
} from "./openings";
import type { Room, Door, Window } from "../types";

describe("openings utilities", () => {
  const room: Room = {
    width: 4000,
    height: 3000,
    wallThickness: 200,
    ceilingHeight: 2400,
    gridSize: 100,
    snapEnabled: true,
    displayUnit: "mm",
  };

  describe("getWallLength", () => {
    it("should return correct wall lengths", () => {
      expect(getWallLength("north", room)).toBe(4000);
      expect(getWallLength("south", room)).toBe(4000);
      expect(getWallLength("east", room)).toBe(3000);
      expect(getWallLength("west", room)).toBe(3000);
    });
  });

  describe("isOpeningInBounds", () => {
    it("should return true for openings within bounds", () => {
      expect(isOpeningInBounds("north", 0, 900, room)).toBe(true);
      expect(isOpeningInBounds("north", 100, 900, room)).toBe(true);
      expect(isOpeningInBounds("north", 3100, 900, room)).toBe(true);
    });

    it("should return false for openings exceeding bounds", () => {
      expect(isOpeningInBounds("north", 3500, 900, room)).toBe(false);
      expect(isOpeningInBounds("north", -100, 900, room)).toBe(false);
    });
  });

  describe("constrainOpeningOffset", () => {
    it("should not modify offset if within bounds", () => {
      expect(constrainOpeningOffset("north", 1000, 900, room)).toBe(1000);
    });

    it("should constrain offset to minimum", () => {
      expect(constrainOpeningOffset("north", -100, 900, room)).toBe(0);
    });

    it("should constrain offset to maximum", () => {
      const result = constrainOpeningOffset("north", 5000, 900, room);
      expect(result).toBe(3100); // 4000 - 900
    });
  });

  describe("doOpeningsOverlap", () => {
    it("should return false for non-overlapping openings", () => {
      expect(doOpeningsOverlap(0, 900, 1000, 900)).toBe(false);
      expect(doOpeningsOverlap(1000, 900, 0, 900)).toBe(false);
    });

    it("should return true for overlapping openings", () => {
      expect(doOpeningsOverlap(0, 900, 800, 900)).toBe(true);
      expect(doOpeningsOverlap(800, 900, 0, 900)).toBe(true);
      expect(doOpeningsOverlap(100, 900, 100, 900)).toBe(true);
    });
  });

  describe("validateDoorPlacement", () => {
    const door: Door = {
      id: "1",
      wall: "north",
      offset: 1000,
      width: 900,
      height: 2100,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "right",
      openAngle: 90,
      thickness: 40,
    };

    it("should validate valid door placement", () => {
      const result = validateDoorPlacement(door, [], [], room);
      expect(result.valid).toBe(true);
    });

    it("should reject door exceeding wall boundaries", () => {
      const invalidDoor = { ...door, offset: 3500 };
      const result = validateDoorPlacement(invalidDoor, [], [], room);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("boundaries");
    });

    it("should reject overlapping doors", () => {
      const door2: Door = { ...door, id: "2", offset: 1500 };
      const result = validateDoorPlacement(door2, [door], [], room);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("overlap");
    });
  });

  describe("validateWindowPlacement", () => {
    const window: Window = {
      id: "1",
      wall: "north",
      offset: 1000,
      width: 1200,
      height: 1200,
      sillHeight: 900,
    };

    it("should validate valid window placement", () => {
      const result = validateWindowPlacement(window, [], [], room);
      expect(result.valid).toBe(true);
    });

    it("should reject window exceeding wall boundaries", () => {
      const invalidWindow = { ...window, offset: 3500 };
      const result = validateWindowPlacement(invalidWindow, [], [], room);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("boundaries");
    });

    it("should reject overlapping windows", () => {
      const window2: Window = { ...window, id: "2", offset: 1500 };
      const result = validateWindowPlacement(window2, [], [window], room);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("overlap");
    });
  });
});
