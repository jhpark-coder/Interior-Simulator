import { Layer, Rect } from "react-konva";
import type { Room } from "../types";

type RoomLayerProps = {
  room: Room;
  onClick: () => void;
  onWallDoubleClick: () => void;
};

export function RoomLayer({ room, onClick, onWallDoubleClick }: RoomLayerProps) {
  const { width, height, wallThickness, wallColor, floorColor } = room;

  return (
    <Layer>
      {/* Floor */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={floorColor ?? "#f5f5f5"}
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
        fill={wallColor ?? "#888"}
        onDblClick={onWallDoubleClick}
        onDblTap={onWallDoubleClick}
      />
      {/* South wall */}
      <Rect
        x={-wallThickness}
        y={height}
        width={width + wallThickness * 2}
        height={wallThickness}
        fill={wallColor ?? "#888"}
        onDblClick={onWallDoubleClick}
        onDblTap={onWallDoubleClick}
      />
      {/* West wall */}
      <Rect
        x={-wallThickness}
        y={0}
        width={wallThickness}
        height={height}
        fill={wallColor ?? "#888"}
        onDblClick={onWallDoubleClick}
        onDblTap={onWallDoubleClick}
      />
      {/* East wall */}
      <Rect
        x={width}
        y={0}
        width={wallThickness}
        height={height}
        fill={wallColor ?? "#888"}
        onDblClick={onWallDoubleClick}
        onDblTap={onWallDoubleClick}
      />
    </Layer>
  );
}
