import { Image as KonvaImage, Layer } from "react-konva";
import type Konva from "konva";
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
  if (!source || !source.visible || !image) return null;
  const imageScale =
    source.transform.scaleMmPerPixel ?? UNCALIBRATED_MM_PER_PIXEL;

  const handleDragEnd = (event: Konva.KonvaEventObject<DragEvent>) => {
    onMove(event.target.x(), event.target.y());
  };

  return (
    <Layer listening={!source.locked}>
      <KonvaImage
        image={image}
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
