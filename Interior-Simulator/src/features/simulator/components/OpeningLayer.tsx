import { Layer, Line, Rect, Arc, Group } from "react-konva";
import type Konva from "konva";
import type { Door, Window, Room, SelectedEntity } from "../types";
import { getOpeningPosition, getDoorArcPoints } from "../utils";
import { useSimulatorStore } from "../store/useSimulatorStore";

type OpeningLayerProps = {
  doors: Door[];
  windows: Window[];
  room: Room;
  selectedEntity: SelectedEntity;
  onSelect: (kind: "door" | "window", id: string) => void;
  onUpdate: (kind: "door" | "window", id: string, patch: any) => void;
};

export function OpeningLayer({
  doors,
  windows,
  room,
  selectedEntity,
  onSelect,
  onUpdate,
}: OpeningLayerProps) {
  return (
    <Layer>
      {doors.map((door) => (
        <DoorItem
          key={door.id}
          door={door}
          room={room}
          isSelected={
            selectedEntity?.kind === "door" && selectedEntity.id === door.id
          }
          onSelect={onSelect}
          onUpdate={onUpdate}
        />
      ))}
      {windows.map((window) => (
        <WindowItem
          key={window.id}
          window={window}
          room={room}
          isSelected={
            selectedEntity?.kind === "window" && selectedEntity.id === window.id
          }
          onSelect={onSelect}
          onUpdate={onUpdate}
        />
      ))}
    </Layer>
  );
}

type DoorItemProps = {
  door: Door;
  room: Room;
  isSelected: boolean;
  onSelect: (kind: "door" | "window", id: string) => void;
  onUpdate: (kind: "door" | "window", id: string, patch: any) => void;
};

function DoorItem({ door, room, isSelected, onSelect, onUpdate }: DoorItemProps) {
  const pos = getOpeningPosition(door.wall, door.offset, room);
  const isHorizontalWall = door.wall === "north" || door.wall === "south";

  const handleClick = () => {
    onSelect("door", door.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { x, y } = node.position();

    // Calculate new offset based on wall orientation
    let newOffset = isHorizontalWall ? x : y;
    newOffset = Math.max(0, newOffset);

    onUpdate("door", door.id, { offset: newOffset });
  };

  const handleDragEnd = () => {
    useSimulatorStore.getState().commitHistory();
  };

  if (door.doorType === "sliding") {
    // Sliding door rendering
    const slideOffset = door.slideDirection === "right" ? door.width * 0.6 : -door.width * 0.6;

    return (
      <Group
        x={pos.x}
        y={pos.y}
        draggable
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={handleClick}
      >
        {/* Door opening (gap in wall) */}
        <Rect
          x={0}
          y={isHorizontalWall ? -room.wallThickness : 0}
          width={isHorizontalWall ? door.width : room.wallThickness}
          height={isHorizontalWall ? room.wallThickness : door.width}
          fill={isSelected ? "#FFD700" : "#f5f5f5"}
          stroke={isSelected ? "#FFA500" : "#888"}
          strokeWidth={2}
        />

        {/* Sliding door panel (closed position) */}
        <Rect
          x={isHorizontalWall ? 0 : -door.thickness / 2}
          y={isHorizontalWall ? -door.thickness / 2 : 0}
          width={isHorizontalWall ? door.width : door.thickness}
          height={isHorizontalWall ? door.thickness : door.width}
          fill={isSelected ? "#8B4513" : "#654321"}
          stroke={isSelected ? "#2E5C8A" : "#444"}
          strokeWidth={2}
        />

        {/* Sliding door panel (open position - ghost) */}
        <Rect
          x={isHorizontalWall ? slideOffset : -door.thickness / 2}
          y={isHorizontalWall ? -door.thickness / 2 : slideOffset}
          width={isHorizontalWall ? door.width : door.thickness}
          height={isHorizontalWall ? door.thickness : door.width}
          fill={isSelected ? "rgba(139, 69, 19, 0.3)" : "rgba(101, 67, 33, 0.3)"}
          stroke={isSelected ? "#4A90E2" : "#888"}
          strokeWidth={1}
          dash={[5, 5]}
          listening={false}
        />

        {/* Slide direction arrow */}
        <Line
          points={
            isHorizontalWall
              ? [door.width / 2, door.thickness, door.width / 2 + slideOffset * 0.3, door.thickness]
              : [door.thickness, door.width / 2, door.thickness, door.width / 2 + slideOffset * 0.3]
          }
          stroke={isSelected ? "#4A90E2" : "#6495ED"}
          strokeWidth={2}
          dash={[3, 3]}
          listening={false}
        />
      </Group>
    );
  }

  // Swing door rendering
  const arcData = getDoorArcPoints(door, room);

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Door opening (gap in wall) */}
      <Rect
        x={0}
        y={isHorizontalWall ? -room.wallThickness : 0}
        width={isHorizontalWall ? door.width : room.wallThickness}
        height={isHorizontalWall ? room.wallThickness : door.width}
        fill={isSelected ? "#FFD700" : "#f5f5f5"}
        stroke={isSelected ? "#FFA500" : "#888"}
        strokeWidth={2}
      />

      {/* Door panel */}
      <Line
        points={
          isHorizontalWall
            ? [0, 0, door.width, 0]
            : [0, 0, 0, door.width]
        }
        stroke={isSelected ? "#2E5C8A" : "#654321"}
        strokeWidth={door.thickness / 10}
      />

      {/* Door swing arc */}
      <Arc
        x={arcData.centerX - pos.x}
        y={arcData.centerY - pos.y}
        innerRadius={arcData.radius}
        outerRadius={arcData.radius}
        angle={Math.abs(arcData.endAngle - arcData.startAngle)}
        rotation={Math.min(arcData.startAngle, arcData.endAngle)}
        stroke={isSelected ? "#4A90E2" : "#6495ED"}
        strokeWidth={2}
        dash={[5, 5]}
        listening={false}
      />

      {/* Door swing end line */}
      <Line
        points={[
          arcData.centerX - pos.x,
          arcData.centerY - pos.y,
          arcData.centerX - pos.x + arcData.radius * Math.cos((arcData.endAngle * Math.PI) / 180),
          arcData.centerY - pos.y + arcData.radius * Math.sin((arcData.endAngle * Math.PI) / 180),
        ]}
        stroke={isSelected ? "#4A90E2" : "#6495ED"}
        strokeWidth={1}
        dash={[5, 5]}
        listening={false}
      />
    </Group>
  );
}

type WindowItemProps = {
  window: Window;
  room: Room;
  isSelected: boolean;
  onSelect: (kind: "door" | "window", id: string) => void;
  onUpdate: (kind: "door" | "window", id: string, patch: any) => void;
};

function WindowItem({
  window,
  room,
  isSelected,
  onSelect,
  onUpdate,
}: WindowItemProps) {
  const pos = getOpeningPosition(window.wall, window.offset, room);
  const isHorizontalWall = window.wall === "north" || window.wall === "south";

  const handleClick = () => {
    onSelect("window", window.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const { x, y } = node.position();

    // Calculate new offset based on wall orientation
    let newOffset = isHorizontalWall ? x : y;
    newOffset = Math.max(0, newOffset);

    onUpdate("window", window.id, { offset: newOffset });
  };

  const handleDragEnd = () => {
    useSimulatorStore.getState().commitHistory();
  };

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      {/* Window opening (gap in wall) */}
      <Rect
        x={0}
        y={isHorizontalWall ? -room.wallThickness : 0}
        width={isHorizontalWall ? window.width : room.wallThickness}
        height={isHorizontalWall ? room.wallThickness : window.width}
        fill={isSelected ? "#87CEEB" : "#ADD8E6"}
        stroke={isSelected ? "#4169E1" : "#4682B4"}
        strokeWidth={2}
      />

      {/* Window panes (decorative) */}
      <Line
        points={
          isHorizontalWall
            ? [window.width / 2, -room.wallThickness, window.width / 2, 0]
            : [0, window.width / 2, room.wallThickness, window.width / 2]
        }
        stroke="#4682B4"
        strokeWidth={1}
        listening={false}
      />
    </Group>
  );
}
