import { describe, it, expect } from "vitest";
import { validateLayoutDoc, LayoutDocSchema } from "./zodSchemas";

describe("zodSchemas", () => {
  const validLayout = {
    version: "1.1.0",
    room: {
      width: 4000,
      height: 3000,
      wallThickness: 200,
      ceilingHeight: 2400,
      gridSize: 100,
      snapEnabled: true,
      displayUnit: "mm",
    },
    furniture: [],
    doors: [],
    windows: [],
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  describe("validateLayoutDoc", () => {
    it("should validate correct layout", () => {
      const result = validateLayoutDoc(validLayout);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should reject invalid version", () => {
      const invalid = { ...validLayout, version: "2.0.0" };
      const result = validateLayoutDoc(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should reject room with invalid dimensions", () => {
      const invalid = {
        ...validLayout,
        room: { ...validLayout.room, width: 500 },
      };
      const result = validateLayoutDoc(invalid);
      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes("width"))).toBe(true);
    });

    it("should reject invalid furniture", () => {
      const invalid = {
        ...validLayout,
        furniture: [
          {
            id: "1",
            type: "desk",
            name: "Desk",
            x: 0,
            y: 0,
            width: 50, // Too small
            depth: 100,
            height: 720,
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
        ],
      };
      const result = validateLayoutDoc(invalid);
      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes("width"))).toBe(true);
    });

    it("should reject door with invalid openAngle", () => {
      const invalid = {
        ...validLayout,
        doors: [
          {
            id: "1",
            wall: "north",
            offset: 1000,
            width: 900,
            height: 2100,
            hinge: "left",
            swing: "inward",
            openAngle: 150, // Too large
            thickness: 40,
          },
        ],
      };
      const result = validateLayoutDoc(invalid);
      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes("angle"))).toBe(true);
    });

    it("should reject missing required fields", () => {
      const invalid = { version: "1.1.0" };
      const result = validateLayoutDoc(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
