import { describe, expect, it } from "vitest";
import { validateInteriorProject } from "../../domain/project";
import { pointAlongWall, wallLength } from "../../domain/structure";
import {
  LEGACY_LAYOUT_V110_FIXTURE,
  LEGACY_LAYOUT_V120_FIXTURE,
} from "../../testFixtures/legacyLayout";
import {
  migrateLegacyLayoutToProject,
  migrateLegacyLayoutToStructure,
} from "./layoutV1ToProjectV2";

describe("legacy layout to project v2 migration", () => {
  it.each([LEGACY_LAYOUT_V110_FIXTURE, LEGACY_LAYOUT_V120_FIXTURE])(
    "migrates layout $version into a valid v2 project",
    (layout) => {
      const project = migrateLegacyLayoutToProject(layout, "테스트 집");
      const result = validateInteriorProject(project);
      expect(result.success).toBe(true);
      expect(project.name).toBe("테스트 집");
      expect(project.scenarios[0].furniture).toEqual(layout.furniture);
    }
  );

  it("converts the rectangle into four walls and one room", () => {
    const structure = migrateLegacyLayoutToStructure(LEGACY_LAYOUT_V110_FIXTURE);
    expect(structure.walls).toHaveLength(4);
    expect(structure.rooms).toHaveLength(1);
    expect(structure.rooms[0].polygon).toEqual([
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      { x: 5000, y: 4000 },
      { x: 0, y: 4000 },
    ]);
    expect(structure.walls.map(wallLength)).toEqual([5000, 4000, 5000, 4000]);
  });

  it("keeps legacy opening offsets on their corresponding walls", () => {
    const structure = migrateLegacyLayoutToStructure(LEGACY_LAYOUT_V110_FIXTURE);
    const migratedDoor = structure.openings.find((opening) => opening.kind === "door")!;
    const migratedWindow = structure.openings.find((opening) => opening.kind === "window")!;
    const doorWall = structure.walls.find((wall) => wall.id === migratedDoor.wallId)!;
    const windowWall = structure.walls.find((wall) => wall.id === migratedWindow.wallId)!;

    expect(pointAlongWall(doorWall, migratedDoor.offset)).toEqual({
      x: 700,
      y: 4000,
    });
    expect(pointAlongWall(windowWall, migratedWindow.offset)).toEqual({
      x: 5000,
      y: 1000,
    });
  });

  it("normalizes invalid legacy timestamps and accepts a caller project id", () => {
    const layout = {
      ...LEGACY_LAYOUT_V120_FIXTURE,
      meta: { createdAt: "legacy", updatedAt: "legacy" },
    };
    const project = migrateLegacyLayoutToProject(layout, "가져온 집", "project-imported");

    expect(project.id).toBe("project-imported");
    expect(project.meta.createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(validateInteriorProject(project).success).toBe(true);
  });
});
