import { Layer, Rect } from "react-konva";
import type { Room } from "../types";

type RoomLayerProps = {
  room: Room;
  onClick: () => void;
};

export function RoomLayer({ room, onClick }: RoomLayerProps) {
  const { width, height, wallThickness } = room;

  return (
    <Layer>
      {/* Floor */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#f5f5f5"
        onClick={onClick}
        onTap={onClick}
      />

      {/* Walls */}
      {/* North wall */}
      <Rect
        x={-wallThickness}
        y={-wallThickness}
        width={width + wallThickness * 2}
        height={wallThickness}
        fill="#888"
        listening={false}
      />
      {/* South wall */}
      <Rect
        x={-wallThickness}
        y={height}
        width={width + wallThickness * 2}
        height={wallThickness}
        fill="#888"
        listening={false}
      />
      {/* West wall */}
      <Rect
        x={-wallThickness}
        y={0}
        width={wallThickness}
        height={height}
        fill="#888"
        listening={false}
      />
      {/* East wall */}
      <Rect
        x={width}
        y={0}
        width={wallThickness}
        height={height}
        fill="#888"
        listening={false}
      />
    </Layer>
  );
}
