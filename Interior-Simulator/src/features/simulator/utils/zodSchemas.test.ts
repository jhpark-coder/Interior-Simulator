import { describe, it, expect } from "vitest";
import { validateLayoutDoc, migrateLayout } from "./zodSchemas";

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
    it("should validate correct v1.1.0 layout (auto-migrated to v1.2.0)", () => {
      const result = validateLayoutDoc(validLayout);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.version).toBe("1.2.0");
    });

    it("should validate correct v1.2.0 layout", () => {
      const result = validateLayoutDoc({ ...validLayout, version: "1.2.0" });
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

    it("should validate furniture with attachment fields", () => {
      const layout = {
        ...validLayout,
        version: "1.2.0",
        furniture: [
          {
            id: "desk-1",
            type: "desk",
            name: "Desk",
            x: 100,
            y: 100,
            width: 1200,
            depth: 600,
            height: 720,
            rotation: 0,
            zIndex: 0,
            locked: false,
          },
          {
            id: "arm-1",
            type: "monitor-arm",
            name: "Monitor Arm",
            x: 200,
            y: 200,
            width: 200,
            depth: 200,
            height: 500,
            rotation: 0,
            zIndex: 1,
            locked: false,
            parentId: "desk-1",
            attachOffsetX: 100,
            attachOffsetY: 0,
          },
        ],
      };
      const result = validateLayoutDoc(layout);
      expect(result.success).toBe(true);
    });
  });

  describe("migrateLayout", () => {
    it("should migrate v1.1.0 to v1.2.0", () => {
      const result = migrateLayout({ ...validLayout });
      expect(result.version).toBe("1.2.0");
    });

    it("should not change v1.2.0", () => {
      const data = { ...validLayout, version: "1.2.0" };
      const result = migrateLayout(data);
      expect(result.version).toBe("1.2.0");
    });
  });
});
