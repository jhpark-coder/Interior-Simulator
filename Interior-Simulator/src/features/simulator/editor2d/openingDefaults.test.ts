import { describe, expect, it } from "vitest";
import { createThreeRoomStructureFixture, validateStructure } from "../domain/structure";
import { canWalkBetween } from "../scene3d/walkCollision";
import { defaultOpeningForTool } from "./openingDefaults";

describe("defaultOpeningForTool", () => {
  it("creates doors with full swing details and windows above the floor", () => {
    expect(defaultOpeningForTool("door")).toMatchObject({
      kind: "door",
      width: 900,
      height: 2100,
      sillHeight: 0,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      openAngle: 90,
    });
    expect(defaultOpeningForTool("window")).toEqual({
      kind: "window",
      width: 1200,
      height: 1200,
      sillHeight: 900,
    });
  });

  it("creates a floor-level passage that first-person walking can pass through", () => {
    // 방 3개 구조의 내부 벽 three-v1: (3000,0)→(3000,4500)
    const structure = createThreeRoomStructureFixture();
    const from = { x: 2500, y: 1800 };
    const to = { x: 3500, y: 1800 };
    expect(canWalkBetween(from, to, structure)).toBe(false);

    structure.openings.push({
      ...defaultOpeningForTool("passage"),
      id: "passage",
      wallId: "three-v1",
      offset: 1300,
      source: { origin: "manual", confirmedByUser: true },
    });
    expect(canWalkBetween(from, to, structure)).toBe(true);
    expect(validateStructure(structure).filter((issue) => issue.severity === "error")).toEqual([]);
  });
});
