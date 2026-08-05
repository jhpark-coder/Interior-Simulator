import { z } from "zod";

export const Vec2Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const SourceInfoSchema = z.object({
  origin: z.enum(["detected", "manual", "default", "migrated"]),
  confidence: z.number().min(0).max(1).optional(),
  confirmedByUser: z.boolean(),
});

export const WallSchema = z
  .object({
    id: z.string().min(1),
    start: Vec2Schema,
    end: Vec2Schema,
    thickness: z.number().min(20).max(2000),
    height: z.number().min(100).max(20000),
    kind: z.enum(["exterior", "interior", "partition"]),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    source: SourceInfoSchema,
  })
  .superRefine((wall, context) => {
    if (Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wall length must be at least 1mm",
        path: ["end"],
      });
    }
  });

export const RoomRegionSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  polygon: z.array(Vec2Schema).min(3),
  wallIds: z.array(z.string().min(1)).min(3),
  usage: z.enum([
    "living",
    "bedroom",
    "kitchen",
    "bathroom",
    "balcony",
    "hallway",
    "utility",
    "other",
  ]),
  floorColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  source: SourceInfoSchema,
});

export const OpeningSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["door", "window", "passage"]),
  wallId: z.string().min(1),
  offset: z.number().min(0),
  width: z.number().min(100),
  height: z.number().min(100),
  sillHeight: z.number().min(0),
  doorType: z.enum(["swing", "sliding"]).optional(),
  hinge: z.enum(["left", "right"]).optional(),
  swing: z.enum(["inward", "outward"]).optional(),
  slideDirection: z.enum(["left", "right"]).optional(),
  openAngle: z.number().min(0).max(180).optional(),
  thickness: z.number().min(1).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  source: SourceInfoSchema,
});

export const FloorStructureSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    elevation: z.number().finite(),
    ceilingHeight: z.number().min(1000).max(20000),
    walls: z.array(WallSchema),
    rooms: z.array(RoomRegionSchema),
    openings: z.array(OpeningSchema),
  })
  .superRefine((structure, context) => {
    const wallIds = new Set(structure.walls.map((wall) => wall.id));
    const duplicateWallIds = structure.walls
      .map((wall) => wall.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);
    for (const id of duplicateWallIds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate wall id: ${id}`,
        path: ["walls"],
      });
    }

    structure.openings.forEach((opening, index) => {
      if (!wallIds.has(opening.wallId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Opening references missing wall: ${opening.wallId}`,
          path: ["openings", index, "wallId"],
        });
      }
    });

    structure.rooms.forEach((room, index) => {
      room.wallIds.forEach((wallId) => {
        if (!wallIds.has(wallId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Room references missing wall: ${wallId}`,
            path: ["rooms", index, "wallIds"],
          });
        }
      });
    });
  });

export type FloorStructureInput = z.input<typeof FloorStructureSchema>;
