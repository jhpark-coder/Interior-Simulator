import { z } from "zod";

// Unit schema
export const UnitSchema = z.enum(["mm", "cm"]);

// WallSide schema
export const WallSideSchema = z.enum(["north", "east", "south", "west"]);

// DoorHinge schema
export const DoorHingeSchema = z.enum(["left", "right"]);

// DoorSwing schema
export const DoorSwingSchema = z.enum(["inward", "outward"]);

// Room schema
export const RoomSchema = z.object({
  width: z.number().min(1000, "Room width must be at least 1000mm"),
  height: z.number().min(1000, "Room height must be at least 1000mm"),
  wallThickness: z.number().min(50, "Wall thickness must be at least 50mm"),
  ceilingHeight: z.number().min(2000, "Ceiling height must be at least 2000mm"),
  gridSize: z.number().min(50, "Grid size must be at least 50mm"),
  snapEnabled: z.boolean(),
  displayUnit: UnitSchema,
  wallColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#b0b0b0"),
  floorColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#c4a882"),
});

// FurnitureType schema
export const FurnitureTypeSchema = z.enum([
  "bed",
  "desk",
  "chair",
  "closet",
  "display-cabinet",
  "bookshelf",
  "sofa",
  "table",
]);

// FurnitureItem schema
export const FurnitureItemSchema = z.object({
  id: z.string(),
  type: FurnitureTypeSchema,
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().min(100, "Furniture width must be at least 100mm"),
  depth: z.number().min(100, "Furniture depth must be at least 100mm"),
  height: z.number().min(100, "Furniture height must be at least 100mm"),
  rotation: z.number(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Furniture color must be a 6-digit hex color")
    .optional(),
  zIndex: z.number(),
  locked: z.boolean(),
});

// Door schema
export const DoorSchema = z.object({
  id: z.string(),
  wall: WallSideSchema,
  offset: z.number().min(0, "Door offset must be non-negative"),
  width: z.number().min(500, "Door width must be at least 500mm"),
  height: z.number().min(1800, "Door height must be at least 1800mm"),
  hinge: DoorHingeSchema,
  swing: DoorSwingSchema,
  openAngle: z
    .number()
    .min(0, "Open angle must be at least 0")
    .max(120, "Open angle must be at most 120"),
  thickness: z.number().min(20, "Door thickness must be at least 20mm"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#654321"),
});

// Window schema
export const WindowSchema = z.object({
  id: z.string(),
  wall: WallSideSchema,
  offset: z.number().min(0, "Window offset must be non-negative"),
  width: z.number().min(300, "Window width must be at least 300mm"),
  height: z.number().min(300, "Window height must be at least 300mm"),
  sillHeight: z.number().min(0, "Sill height must be non-negative"),
});

// LayoutDoc schema
export const LayoutDocSchema = z.object({
  version: z.literal("1.1.0"),
  room: RoomSchema,
  furniture: z.array(FurnitureItemSchema),
  doors: z.array(DoorSchema),
  windows: z.array(WindowSchema),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

// Type inference
export type LayoutDocInput = z.infer<typeof LayoutDocSchema>;

/**
 * Validates a LayoutDoc object
 */
export function validateLayoutDoc(data: unknown): {
  success: boolean;
  data?: LayoutDocInput;
  errors?: string[];
} {
  try {
    const result = LayoutDocSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      );
      return { success: false, errors };
    }
    return {
      success: false,
      errors: ["Unknown validation error occurred"],
    };
  }
}

/**
 * Safely validates a LayoutDoc object (non-throwing)
 */
export function safeValidateLayoutDoc(data: unknown) {
  return LayoutDocSchema.safeParse(data);
}
