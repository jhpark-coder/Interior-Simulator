import type { MemoryPin } from "../../domain/memory";
import type { ProjectAsset } from "../../domain/project";

export function collectUnusedMemoryAssetIds(
  ownerPinId: string,
  candidateAssetIds: string[],
  pins: MemoryPin[],
  assets: ProjectAsset[]
): string[] {
  const referencedByOtherPins = new Set(
    pins.filter((pin) => pin.id !== ownerPinId).flatMap((pin) => pin.assetIds)
  );
  const unusedAssetIds = new Set(
    candidateAssetIds.filter((assetId) => !referencedByOtherPins.has(assetId))
  );
  assets.forEach((asset) => {
    if (asset.parentAssetId && unusedAssetIds.has(asset.parentAssetId)) {
      unusedAssetIds.add(asset.id);
    }
  });
  return [...unusedAssetIds];
}
