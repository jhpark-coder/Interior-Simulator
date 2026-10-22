import { describe, expect, it } from "vitest";
import { createApartment84StructureFixture } from "./apartmentSample";
import { polygonArea, validateStructure } from "./geometry";
import { FloorStructureSchema } from "./schema";

function roomArea(name: string) {
  const structure = createApartment84StructureFixture();
  const room = structure.rooms.find((item) => item.name === name);
  if (!room) throw new Error(`missing room ${name}`);
  return polygonArea(room.polygon);
}

describe("createApartment84StructureFixture", () => {
  it("is a valid structure with no issues", () => {
    const structure = createApartment84StructureFixture();
    expect(FloorStructureSchema.safeParse(structure).success).toBe(true);
    expect(validateStructure(structure)).toEqual([]);
  });

  it("spans 9000 × 11900 mm with a 2300 mm ceiling", () => {
    const structure = createApartment84StructureFixture();
    const xs = structure.walls.flatMap((wall) => [wall.start.x, wall.end.x]);
    const ys = structure.walls.flatMap((wall) => [wall.start.y, wall.end.y]);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(9000);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(11900);
    expect(structure.ceilingHeight).toBe(2300);
    expect(structure.walls.every((wall) => wall.height === 2300)).toBe(true);
  });

  it("names every detected room", () => {
    const names = createApartment84StructureFixture()
      .rooms.map((room) => room.name)
      .sort();
    expect(names).toEqual(
      [
        "거실·주방",
        "다용도",
        "발코니",
        "발코니",
        "발코니",
        "방 1",
        "방 2",
        "방 3",
        "욕실 1",
        "욕실 2",
      ].sort()
    );
  });

  it("matches the transcribed room sizes", () => {
    expect(roomArea("방 1")).toBe(4500 * 3900);
    expect(roomArea("방 2")).toBe(3300 * 2700);
    expect(roomArea("방 3")).toBe(2700 * 3000);
    expect(roomArea("거실·주방")).toBe(3000 * 5250 + 1200 * 1450 + 4500 * 5350);
  });

  it("keeps the heated floor area close to an 84 ㎡ unit", () => {
    const structure = createApartment84StructureFixture();
    const heated = structure.rooms
      .filter((room) => room.usage !== "balcony")
      .reduce((sum, room) => sum + polygonArea(room.polygon), 0);
    expect(heated / 1_000_000).toBeGreaterThan(82);
    expect(heated / 1_000_000).toBeLessThan(86);
  });

  it("gives every bedroom and bathroom a door and has a front door", () => {
    const structure = createApartment84StructureFixture();
    const doorWallIds = new Set(
      structure.openings
        .filter((opening) => opening.kind === "door")
        .map((opening) => opening.wallId)
    );
    for (const room of structure.rooms) {
      if (room.usage !== "bedroom" && room.usage !== "bathroom") continue;
      expect(room.wallIds.some((id) => doorWallIds.has(id)), room.name).toBe(true);
    }
    const exteriorDoors = structure.openings.filter(
      (opening) =>
        opening.kind === "door" &&
        structure.walls.find((wall) => wall.id === opening.wallId)?.kind === "exterior"
    );
    expect(exteriorDoors).toHaveLength(1);
  });
});
