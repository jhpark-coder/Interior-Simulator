import { useEffect, useRef } from "react";
import { Group, Image as KonvaImage, Layer, Rect } from "react-konva";
import Konva from "konva";
import { visibleImageRect, type FloorPlanSource } from "../domain/import";
import { useFloorPlanImage } from "../floorplan/useFloorPlanImage";

export const UNCALIBRATED_MM_PER_PIXEL = 10;
// Konva는 cropWidth·cropHeight가 0이면 이미지 전체를 그린다. 자르기를 풀 때 이전 영역이
// 남지 않도록 undefined 대신 이 값을 넘긴다.
const NO_CROP = { x: 0, y: 0, width: 0, height: 0 };

type FloorPlanLayerProps = {
  source: FloorPlanSource | null;
  objectUrl?: string;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  /** 자르기 영역을 고르는 동안 잘린 바깥까지 보여 주고 현재 영역은 점선으로 표시한다. */
  showFullImage?: boolean;
};

export function FloorPlanLayer({
  source,
  objectUrl,
  selected,
  onSelect,
  onMove,
  showFullImage = false,
}: FloorPlanLayerProps) {
  const image = useFloorPlanImage(objectUrl);
  const imageRef = useRef<Konva.Image>(null);
  const brightness = source?.adjustments.brightness ?? 0;
  const contrast = source?.adjustments.contrast ?? 0;
  const grayscale = source?.adjustments.grayscale ?? false;
  const adjusted = brightness !== 0 || contrast !== 0 || grayscale;
  const visible = !!source && source.visible && !!image;
  const crop = source && !showFullImage ? source.crop : undefined;
  const cropKey = crop ? `${crop.x}:${crop.y}:${crop.width}:${crop.height}` : "";

  // Konva 필터는 캐시된 비트맵에 적용된다. 원본 해상도(pixelRatio 1)로 캐시하고,
  // 보정이 없으면 캐시를 지워 메모리를 쓰지 않는다.
  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;
    if (adjusted) node.cache({ pixelRatio: 1 });
    else node.clearCache();
    node.getLayer()?.batchDraw();
  }, [adjusted, brightness, contrast, cropKey, grayscale, image, visible]);

  if (!source || !source.visible || !image) return null;
  const imageScale =
    source.transform.scaleMmPerPixel ?? UNCALIBRATED_MM_PER_PIXEL;

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    onMove(event.target.x(), event.target.y());
  };
  // 그룹은 원본 이미지 좌표계(픽셀)다. 잘린 이미지를 원래 픽셀 위치에 두어 축척 기준점과
  // 이미 그린 벽이 그대로 맞는다.
  const shown = crop ?? visibleImageRect({ ...source, crop: undefined });

  return (
    <Layer listening={!source.locked}>
      <Group
        x={source.transform.x}
        y={source.transform.y}
        scaleX={imageScale}
        scaleY={imageScale}
        rotation={source.transform.rotation}
        draggable={!source.locked}
        onDragEnd={handleDragEnd}
      >
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
          x={shown.x}
          y={shown.y}
          width={shown.width}
          height={shown.height}
          crop={crop ?? NO_CROP}
          opacity={source.opacity}
          stroke={selected ? "#2563eb" : undefined}
          strokeWidth={selected ? 20 / imageScale : 0}
          onClick={onSelect}
          onTap={onSelect}
        />
        {showFullImage && source.crop && (
          <Rect
            x={source.crop.x}
            y={source.crop.y}
            width={source.crop.width}
            height={source.crop.height}
            stroke="#2563eb"
            strokeWidth={2}
            strokeScaleEnabled={false}
            dash={[8, 6]}
            listening={false}
          />
        )}
      </Group>
    </Layer>
  );
}
