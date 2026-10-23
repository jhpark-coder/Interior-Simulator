import { beforeEach, describe, expect, it } from "vitest";
import {
  createRectangularStructureFixture,
  createThreeRoomStructureFixture,
  wallLength,
} from "../domain/structure";
import { useSimulatorStore } from "./useSimulatorStore";

function resetStructure() {
  const structure = createRectangularStructureFixture();
  useSimulatorStore.setState({
    structure,
    structurePast: [],
    structureFuture: [],
    structureIssues: [],
    selectedStructureEntity: null,
  });
}

function state() {
  return useSimulatorStore.getState();
}

describe("structureSlice", () => {
  beforeEach(resetStructure);

  it("adds a wall and records structure history", () => {
    const id = state().addWall(
      { x: 2500, y: 0 },
      { x: 2500, y: 4000 },
      { id: "partition-1" }
    );
    expect(id).toBe("partition-1");
    expect(state().structure.walls).toHaveLength(5);
    expect(state().structurePast).toHaveLength(1);
    expect(state().selectedStructureEntity).toEqual({
      kind: "wall",
      id: "partition-1",
    });
  });

  it("rejects walls shorter than the editor minimum", () => {
    const id = state().addWall({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(id).toBeNull();
    expect(state().structure.walls).toHaveLength(4);
  });

  it("moves connected endpoints together", () => {
    state().moveWallEndpoint("rect-north", "end", { x: 5300, y: 100 });
    const north = state().structure.walls.find((wall) => wall.id === "rect-north")!;
    const east = state().structure.walls.find((wall) => wall.id === "rect-east")!;
    expect(north.end).toEqual({ x: 5300, y: 100 });
    expect(east.start).toEqual({ x: 5300, y: 100 });
  });

  it("sets a wall length by moving its end point and the connected wall", () => {
    // rect-north: (0,0)→(5000,0), rect-east: (5000,0)→(5000,4000)
    expect(state().setWallLength("rect-north", 6000)).toBe(true);
    const walls = new Map(state().structure.walls.map((wall) => [wall.id, wall]));
    expect(walls.get("rect-north")).toMatchObject({ start: { x: 0, y: 0 }, end: { x: 6000, y: 0 } });
    expect(walls.get("rect-east")!.start).toEqual({ x: 6000, y: 0 });
    expect(wallLength(walls.get("rect-north")!)).toBeCloseTo(6000);
    expect(state().structurePast).toHaveLength(1);

    state().undoStructure();
    expect(state().structure.walls.find((wall) => wall.id === "rect-north")!.end).toEqual({
      x: 5000,
      y: 0,
    });
  });

  it("keeps the wall when the requested length is below the minimum", () => {
    const before = state().structure;
    expect(state().setWallLength("rect-north", 10)).toBe(false);
    expect(state().setWallLength("rect-north", Number.NaN)).toBe(false);
    expect(state().setWallLength("missing", 3000)).toBe(false);
    expect(state().structure).toBe(before);
    expect(state().structurePast).toHaveLength(0);
  });

  it("splits a wall and moves openings to the correct new segment", () => {
    state().addStructureOpening({
      id: "window-1",
      kind: "window",
      wallId: "rect-north",
      offset: 3500,
      width: 800,
      height: 1200,
      sillHeight: 900,
    });
    expect(state().splitWall("rect-north", { x: 2500, y: 0 })).toBe(true);
    const northWalls = state().structure.walls.filter(
      (wall) =>
        wall.start.y === 0 &&
        wall.end.y === 0 &&
        wallLength(wall) === 2500
    );
    expect(northWalls).toHaveLength(2);
    const opening = state().structure.openings[0];
    expect(opening.wallId).toBe(northWalls[1].id);
    expect(opening.offset).toBe(1000);
  });

  it("does not split through an opening", () => {
    state().addStructureOpening({
      kind: "door",
      wallId: "rect-north",
      offset: 2100,
      width: 900,
      height: 2100,
      sillHeight: 0,
    });
    expect(state().splitWall("rect-north", { x: 2500, y: 0 })).toBe(false);
    expect(state().structure.walls).toHaveLength(4);
  });

  it("removes openings together with their wall", () => {
    state().addStructureOpening({
      kind: "door",
      wallId: "rect-west",
      offset: 500,
      width: 900,
      height: 2100,
      sillHeight: 0,
    });
    state().removeWall("rect-west");
    expect(state().structure.openings).toHaveLength(0);
    expect(state().structure.walls.some((wall) => wall.id === "rect-west")).toBe(false);
  });

  it("undoes and redoes structure edits independently", () => {
    state().removeWall("rect-east");
    expect(state().structure.walls).toHaveLength(3);
    state().undoStructure();
    expect(state().structure.walls).toHaveLength(4);
    state().redoStructure();
    expect(state().structure.walls).toHaveLength(3);
  });

  it("accepts a multi-room fixture and validates its four rooms", () => {
    state().setStructure(createThreeRoomStructureFixture());
    expect(state().structure.rooms).toHaveLength(4);
    expect(
      state().structureIssues.filter((issue) => issue.severity === "error")
    ).toHaveLength(0);
  });
});
