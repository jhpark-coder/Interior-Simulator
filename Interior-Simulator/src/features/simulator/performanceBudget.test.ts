import { describe, expect, it } from "vitest";
import { createRectangularStructureFixture } from "./domain/structure";
import type { FurnitureItem, FurnitureType } from "./types";
import { buildStructureWallSegments } from "./scene3d/structure3dMath";
import { validateFurnitureInStructure } from "./utils";

function furniture(index: number): FurnitureItem {
  const type: FurnitureType = "chair";
  return {
    id: `furniture-${index}`,
    type,
    category: "furniture",
    name: `의자 ${index}`,
    x: 350 + (index % 10) * 430,
    y: 350 + (Math.floor(index / 10) % 7) * 450,
    width: 300,
    depth: 300,
    height: 850,
    rotation: (index % 4) * 15,
    color: "#cfcfcf",
    zIndex: index,
    locked: false,
  };
}

describe("large project performance budget", () => {
  it("builds 3D mesh data for 200 walls within the interactive budget", () => {
    const structure = createRectangularStructureFixture();
    for (let index = 0; index < 196; index += 1) {
      const y = 100 + index * 20;
      structure.walls.push({
        id: `perf-wall-${index}`,
        start: { x: 100, y },
        end: { x: 4900, y },
        thickness: 100,
        height: 2400,
        kind: "interior",
        source: { origin: "manual", confirmedByUser: true },
      });
    }
    const startedAt = performance.now();
    const segments = buildStructureWallSegments(structure);
    const elapsed = performance.now() - startedAt;
    expect(segments).toHaveLength(200);
    expect(elapsed).toBeLessThan(1000);
  });

  it("validates 300 furniture placements within one second", () => {
    const structure = createRectangularStructureFixture();
    const items = Array.from({ length: 300 }, (_, index) => furniture(index));
    const startedAt = performance.now();
    const results = items.map((item) =>
      validateFurnitureInStructure(item, structure)
    );
    const elapsed = performance.now() - startedAt;
    expect(results).toHaveLength(300);
    expect(elapsed).toBeLessThan(1000);
  });
});
