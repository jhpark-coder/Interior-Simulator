import { z } from "zod";
import {
  FurnitureItemSchema,
  ItemCategorySchema,
} from "../../utils/zodSchemas";
import { Vec2Schema, FloorStructureSchema } from "../structure/schema";

const CalibrationAnchorSchema = z.object({
  id: z.string().min(1),
  startPixel: Vec2Schema,
  endPixel: Vec2Schema,
  realLengthMm: z.number().positive(),
});

const FloorPlanSourceSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  assetId: z.string().min(1),
  originalAssetId: z.string().min(1).optional(),
  pageNumber: z.number().int().positive().optional(),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    rotation: z.number().finite(),
    scaleMmPerPixel: z.number().positive().nullable(),
  }),
  adjustments: z.object({
    brightness: z.number().min(-1).max(1),
    contrast: z.number().min(-1).max(1),
    threshold: z.number().min(0).max(255).nullable(),
    grayscale: z.boolean(),
  }),
  calibrationAnchors: z.array(CalibrationAnchorSchema),
});

const ProjectAssetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["floorplan", "photo", "texture", "thumbnail"]),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  parentAssetId: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
});

const StructureRevisionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentRevisionId: z.string().min(1).optional(),
  origin: z.enum(["detected", "manual", "default", "migrated"]),
  structure: FloorStructureSchema,
  createdAt: z.string().datetime(),
});

const MaterialAssignmentSchema = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  surface: z.enum(["wall", "floor", "ceiling", "door", "window"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textureAssetId: z.string().min(1).optional(),
  roughness: z.number().min(0).max(1).optional(),
});

const ProjectFurnitureItemSchema = FurnitureItemSchema.extend({
  category: ItemCategorySchema,
});

const ScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  structureRevisionId: z.string().min(1),
  furniture: z.array(ProjectFurnitureItemSchema),
  materials: z.array(MaterialAssignmentSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const MemoryPinSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1).optional(),
  position: Vec2Schema,
  cameraDirection: z.number().finite().optional(),
  title: z.string(),
  note: z.string(),
  assetIds: z.array(z.string().min(1)),
  capturedAt: z.string().datetime().optional(),
  temporalState: z.enum(["past", "current", "planned"]).default("current"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SavedViewpointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
  }),
  target: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
  }),
  createdAt: z.string().datetime(),
});

export const InteriorProjectSchema = z
  .object({
    version: z.literal("2.0.0"),
    id: z.string().min(1),
    name: z.string().min(1),
    sources: z.array(FloorPlanSourceSchema),
    assets: z.array(ProjectAssetSchema),
    structureRevisions: z.array(StructureRevisionSchema).min(1),
    activeStructureRevisionId: z.string().min(1),
    scenarios: z.array(ScenarioSchema).min(1),
    activeScenarioId: z.string().min(1),
    memoryPins: z.array(MemoryPinSchema),
    savedViewpoints: z.array(SavedViewpointSchema),
    meta: z.object({
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  })
  .superRefine((project, context) => {
    const revisionIds = new Set(project.structureRevisions.map((revision) => revision.id));
    const scenarioIds = new Set(project.scenarios.map((scenario) => scenario.id));
    const assetIds = new Set(project.assets.map((asset) => asset.id));

    if (!revisionIds.has(project.activeStructureRevisionId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Active structure revision does not exist",
        path: ["activeStructureRevisionId"],
      });
    }
    if (!scenarioIds.has(project.activeScenarioId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Active scenario does not exist",
        path: ["activeScenarioId"],
      });
    }
    project.scenarios.forEach((scenario, index) => {
      if (!revisionIds.has(scenario.structureRevisionId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Scenario references a missing structure revision",
          path: ["scenarios", index, "structureRevisionId"],
        });
      }
    });
    project.sources.forEach((source, index) => {
      if (!assetIds.has(source.assetId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Floor plan source references a missing asset",
          path: ["sources", index, "assetId"],
        });
      }
      if (
        source.originalAssetId &&
        !assetIds.has(source.originalAssetId)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Floor plan source references a missing original asset",
          path: ["sources", index, "originalAssetId"],
        });
      }
    });
    project.memoryPins.forEach((pin, pinIndex) => {
      pin.assetIds.forEach((assetId, assetIndex) => {
        if (!assetIds.has(assetId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Memory pin references a missing asset",
            path: ["memoryPins", pinIndex, "assetIds", assetIndex],
          });
        }
      });
    });
    project.assets.forEach((asset, assetIndex) => {
      if (asset.parentAssetId && !assetIds.has(asset.parentAssetId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Derived asset references a missing parent asset",
          path: ["assets", assetIndex, "parentAssetId"],
        });
      }
    });
  });

export type InteriorProjectInput = z.input<typeof InteriorProjectSchema>;

export function validateInteriorProject(data: unknown) {
  return InteriorProjectSchema.safeParse(data);
}
