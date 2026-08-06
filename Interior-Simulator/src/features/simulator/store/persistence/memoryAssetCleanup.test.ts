import { describe, expect, it } from "vitest";
import type { MemoryPin } from "../../domain/memory";
import type { ProjectAsset } from "../../domain/project";
import { collectUnusedMemoryAssetIds } from "./memoryAssetCleanup";

const createdAt = "2026-08-06T00:00:00.000Z";

function pin(id: string, assetIds: string[]): MemoryPin {
  return {
    id,
    position: { x: 0, y: 0 },
    title: id,
    note: "",
    assetIds,
    temporalState: "current",
    createdAt,
    updatedAt: createdAt,
  };
}

function asset(id: string, kind: ProjectAsset["kind"], parentAssetId?: string): ProjectAsset {
  return {
    id,
    kind,
    parentAssetId,
    fileName: `${id}.jpg`,
    mimeType: "image/jpeg",
    size: 10,
    createdAt,
  };
}

describe("collectUnusedMemoryAssetIds", () => {
  it("includes thumbnails when the removed pin is the final photo owner", () => {
    const pins = [pin("pin-1", ["photo-1"])];
    const assets = [asset("photo-1", "photo"), asset("thumbnail-1", "thumbnail", "photo-1")];

    expect(collectUnusedMemoryAssetIds("pin-1", ["photo-1"], pins, assets)).toEqual([
      "photo-1",
      "thumbnail-1",
    ]);
  });

  it("preserves a photo and thumbnail referenced by another pin", () => {
    const pins = [pin("pin-1", ["photo-1"]), pin("pin-2", ["photo-1"])];
    const assets = [asset("photo-1", "photo"), asset("thumbnail-1", "thumbnail", "photo-1")];

    expect(collectUnusedMemoryAssetIds("pin-1", ["photo-1"], pins, assets)).toEqual([]);
  });
});
