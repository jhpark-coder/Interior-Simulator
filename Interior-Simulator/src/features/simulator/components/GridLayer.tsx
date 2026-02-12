import React from "react";
import { Layer, Line } from "react-konva";
import type { Room } from "../types";

type GridLayerProps = {
  room: Room;
  visible: boolean;
};

export function GridLayer({ room, visible }: GridLayerProps) {
  if (!visible) return null;

  const lines: React.JSX.Element[] = [];
  const { width, height, gridSize } = room;

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke="#e0e0e0"
        strokeWidth={x % (gridSize * 5) === 0 ? 1.5 : 0.5}
        listening={false}
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke="#e0e0e0"
        strokeWidth={y % (gridSize * 5) === 0 ? 1.5 : 0.5}
        listening={false}
      />
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
}
