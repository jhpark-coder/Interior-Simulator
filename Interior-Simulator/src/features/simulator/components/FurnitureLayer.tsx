import { useRef, useEffect } from "react";
import { Layer, Rect, Text, Group, Circle, Line } from "react-konva";
import type Konva from "konva";
import type { FurnitureItem, FurnitureType, Room, SelectedEntity } from "../types";
import { snapPosition, constrainToRoom } from "../utils";
import { useSimulatorStore } from "../store/useSimulatorStore";

type FurnitureLayerProps = {
  furniture: FurnitureItem[];
  room: Room;
  selectedEntity: SelectedEntity;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FurnitureItem>) => void;
};

// Furniture colors by type
const getFurnitureColor = (type: FurnitureType): string => {
  const colors: Record<FurnitureType, string> = {
    bed: "#8B4513",      // Brown
    desk: "#4169E1",     // Royal Blue
    chair: "#FF8C00",    // Dark Orange
    closet: "#8B008B",   // Dark Magenta
    sofa: "#DC143C",     // Crimson
    table: "#228B22",    // Forest Green
  };
  return colors[type];
};

const getFurnitureStroke = (type: FurnitureType): string => {
  const strokes: Record<FurnitureType, string> = {
    bed: "#654321",
    desk: "#2E5C8A",
    chair: "#CC6600",
    closet: "#660066",
    sofa: "#AA0000",
    table: "#1B6B1B",
  };
  return strokes[type];
};

// Render type-specific markers
const renderFurnitureMarker = (item: FurnitureItem) => {
  const cx = item.width / 2;
  const cy = item.depth / 2;

  switch (item.type) {
    case "bed":
      // Pillow indicator
      return (
        <Rect
          x={item.width * 0.1}
          y={item.depth * 0.1}
          width={item.width * 0.8}
          height={item.depth * 0.25}
          fill="rgba(255, 255, 255, 0.3)"
          cornerRadius={8}
          listening={false}
        />
      );
    case "desk":
      // Drawers
      return (
        <>
          <Rect
            x={item.width * 0.7}
            y={item.depth * 0.2}
            width={item.width * 0.2}
            height={item.depth * 0.2}
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth={2}
            listening={false}
          />
          <Rect
            x={item.width * 0.7}
            y={item.depth * 0.5}
            width={item.width * 0.2}
            height={item.depth * 0.2}
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth={2}
            listening={false}
          />
        </>
      );
    case "chair":
      // Seat back
      return (
        <Rect
          x={item.width * 0.2}
          y={item.depth * 0.05}
          width={item.width * 0.6}
          height={item.depth * 0.15}
          fill="rgba(255, 255, 255, 0.4)"
          cornerRadius={4}
          listening={false}
        />
      );
    case "closet":
      // Door line
      return (
        <Line
          points={[cx, item.depth * 0.1, cx, item.depth * 0.9]}
          stroke="rgba(255, 255, 255, 0.6)"
          strokeWidth={2}
          listening={false}
        />
      );
    case "sofa":
      // Cushions
      return (
        <>
          <Circle
            x={item.width * 0.25}
            y={cy}
            radius={Math.min(item.width, item.depth) * 0.15}
            fill="rgba(255, 255, 255, 0.3)"
            listening={false}
          />
          <Circle
            x={item.width * 0.75}
            y={cy}
            radius={Math.min(item.width, item.depth) * 0.15}
            fill="rgba(255, 255, 255, 0.3)"
            listening={false}
          />
        </>
      );
    case "table":
      // Table top outline
      return (
        <Rect
          x={item.width * 0.1}
          y={item.depth * 0.1}
          width={item.width * 0.8}
          height={item.depth * 0.8}
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth={2}
          cornerRadius={4}
          listening={false}
        />
      );
    default:
      return null;
  }
};

export function FurnitureLayer({
  furniture,
  room,
  selectedEntity,
  onSelect,
  onUpdate,
}: FurnitureLayerProps) {
  return (
    <Layer>
      {furniture.map((item) => (
        <FurnitureItem
          key={item.id}
          item={item}
          room={room}
          isSelected={
            selectedEntity?.kind === "furniture" && selectedEntity.id === item.id
          }
          onSelect={onSelect}
          onUpdate={onUpdate}
        />
      ))}
    </Layer>
  );
}

type FurnitureItemProps = {
  item: FurnitureItem;
  room: Room;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FurnitureItem>) => void;
};

function FurnitureItem({
  item,
  room,
  isSelected,
  onSelect,
  onUpdate,
}: FurnitureItemProps) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation(item.rotation);
    }
  }, [item.rotation]);

  const handleDragStart = () => {
    onSelect(item.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    let { x, y } = node.position();

    // Apply snap
    const snapped = snapPosition(x, y, room);
    x = snapped.x;
    y = snapped.y;

    // Apply boundary constraints
    const constrained = constrainToRoom({ ...item, x, y }, room);
    x = constrained.x;
    y = constrained.y;

    node.position({ x, y });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { x, y } = node.position();
    onUpdate(item.id, { x, y });
    // Commit history after drag ends
    useSimulatorStore.getState().commitHistory();
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!isSelected) return;

    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -1 : 1;
    const rotationStep = e.evt.shiftKey ? 1 : 15;
    const newRotation = (item.rotation + delta * rotationStep) % 360;

    onUpdate(item.id, { rotation: newRotation });
    // Commit history after rotation
    useSimulatorStore.getState().commitHistory();
  };

  const handleClick = () => {
    onSelect(item.id);
  };

  return (
    <Group
      ref={groupRef}
      x={item.x}
      y={item.y}
      draggable={!item.locked}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onWheel={handleWheel}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Rect
        width={item.width}
        height={item.depth}
        fill={isSelected ? "#4A90E2" : getFurnitureColor(item.type)}
        stroke={isSelected ? "#2E5C8A" : getFurnitureStroke(item.type)}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
      />
      {/* Type-specific visual markers */}
      {renderFurnitureMarker(item)}
      <Text
        text={item.name}
        width={item.width}
        height={item.depth}
        align="center"
        verticalAlign="middle"
        fontSize={16}
        fontStyle="bold"
        fill="white"
        listening={false}
      />
    </Group>
  );
}
