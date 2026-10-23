import { useEffect, useRef } from "react";
import { Image as KonvaImage, Layer } from "react-konva";
import Konva from "konva";
import type { FloorPlanSource } from "../domain/import";
import { useFloorPlanImage } from "../floorplan/useFloorPlanImage";

export const UNCALIBRATED_MM_PER_PIXEL = 10;

type FloorPlanLayerProps = {
  source: FloorPlanSource | null;
  objectUrl?: string;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
};

export function FloorPlanLayer({
  source,
  objectUrl,
  selected,
  onSelect,
  onMove,
}: FloorPlanLayerProps) {
  const image = useFloorPlanImage(objectUrl);
  const imageRef = useRef<Konva.Image>(null);
  const brightness = source?.adjustments.brightness ?? 0;
  const contrast = source?.adjustments.contrast ?? 0;
  const grayscale = source?.adjustments.grayscale ?? false;
  const adjusted = brightness !== 0 || contrast !== 0 || grayscale;
  const visible = !!source && source.visible && !!image;

  // Konva 필터는 캐시된 비트맵에 적용된다. 원본 해상도(pixelRatio 1)로 캐시하고,
  // 보정이 없으면 캐시를 지워 메모리를 쓰지 않는다.
  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;
    if (adjusted) node.cache({ pixelRatio: 1 });
    else node.clearCache();
    node.getLayer()?.batchDraw();
  }, [adjusted, brightness, contrast, grayscale, image, visible]);

  if (!source || !source.visible || !image) return null;
  const imageScale =
    source.transform.scaleMmPerPixel ?? UNCALIBRATED_MM_PER_PIXEL;

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    onMove(event.target.x(), event.target.y());
  };

  return (
    <Layer listening={!source.locked}>
      <KonvaImage
        ref={imageRef}
        image={image}
        filters={
          adjusted
            ? [
                ...(grayscale ? [Konva.Filters.Grayscale] : []),
                Konva.Filters.Brighten,
                Konva.Filters.Contrast,
              ]
            : []
        }
        brightness={brightness}
        // 저장값은 -1~1, Konva Contrast는 -100~100이다.
        contrast={contrast * 100}
        x={source.transform.x}
        y={source.transform.y}
        width={source.widthPx}
        height={source.heightPx}
        scaleX={imageScale}
        scaleY={imageScale}
        rotation={source.transform.rotation}
        opacity={source.opacity}
        draggable={!source.locked}
        stroke={selected ? "#2563eb" : undefined}
        strokeWidth={selected ? 20 / imageScale : 0}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
      />
    </Layer>
  );
}
