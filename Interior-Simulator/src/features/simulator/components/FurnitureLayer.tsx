import { useRef, useEffect, useState } from "react";
import { Layer, Rect, Text, Group, Circle, Line } from "react-konva";
import type Konva from "konva";
import type { FurnitureItem, Room, SelectedEntity } from "../types";
import { snapPosition, constrainToRoom, checkCollisionWithOthers, getCollisionPolygons, degToRad } from "../utils";
import { DEFAULT_FURNITURE_COLOR } from "../constants";
import { useSimulatorStore } from "../store/useSimulatorStore";

type PendingFurniture = Omit<FurnitureItem, "id">;

type FurnitureLayerProps = {
  furniture: FurnitureItem[];
  pendingFurniture: PendingFurniture | null;
  placingFurnitureId: string | null;
  placingFurniture: PendingFurniture | null;
  room: Room;
  selectedEntity: SelectedEntity;
  onSelect: (id: string) => void;
  onStartPlacement: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FurnitureItem>) => void;
  onUpdatePending: (patch: Partial<PendingFurniture>) => void;
  onUpdatePlacing: (patch: Partial<PendingFurniture>) => void;
};

type FurnitureItemProps = {
  item: FurnitureItem;
  room: Room;
  allFurniture: FurnitureItem[];
  isSelected: boolean;
  isPlacementEnabled?: boolean;
  onSelect: (id: string) => void;
  onStartPlacement: (id: string) => void;
  onUpdate: (id: string, patch: Partial<FurnitureItem>) => void;
};

type PendingFurnitureItemProps = {
  item: PendingFurniture;
  room: Room;
  allFurniture: FurnitureItem[];
  onUpdate: (patch: Partial<PendingFurniture>) => void;
};

const DEFAULT_FURNITURE_STROKE = "#a8a8a8";

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
  pendingFurniture,
  placingFurnitureId,
  placingFurniture,
  room,
  selectedEntity,
  onSelect,
  onStartPlacement,
  onUpdate,
  onUpdatePending,
  onUpdatePlacing,
}: FurnitureLayerProps) {
  return (
    <Layer>
      {furniture
        .filter((item) => item.id !== placingFurnitureId)
        .map((item) => (
        <FurnitureItem
          key={item.id}
          item={item}
          room={room}
          allFurniture={furniture}
          isSelected={
            selectedEntity?.kind === "furniture" && selectedEntity.id === item.id
          }
          isPlacementEnabled={false}
          onSelect={onSelect}
          onStartPlacement={onStartPlacement}
          onUpdate={onUpdate}
        />
      ))}
      {placingFurniture && placingFurnitureId && (
        <PendingFurnitureItem
          item={placingFurniture}
          room={room}
          allFurniture={furniture.filter((item) => item.id !== placingFurnitureId)}
          onUpdate={onUpdatePlacing}
        />
      )}
      {pendingFurniture && (
        <PendingFurnitureItem
          item={pendingFurniture}
          room={room}
          allFurniture={furniture}
          onUpdate={onUpdatePending}
        />
      )}
    </Layer>
  );
}

function FurnitureItem({
  item,
  room,
  allFurniture,
  isSelected,
  isPlacementEnabled = false,
  onSelect,
  onStartPlacement,
  onUpdate,
}: FurnitureItemProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [lastValidPos, setLastValidPos] = useState({ x: item.x, y: item.y });
  const halfWidth = item.width / 2;
  const halfDepth = item.depth / 2;

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation(item.rotation);
    }
  }, [item.rotation]);

  const handleDragStart = () => {
    onSelect(item.id);
    setLastValidPos({ x: item.x, y: item.y });
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const nodePos = node.position();
    let x = nodePos.x - halfWidth;
    let y = nodePos.y - halfDepth;

    // Apply snap
    const snapped = snapPosition(x, y, room);
    x = snapped.x;
    y = snapped.y;

    // Apply boundary constraints
    const constrained = constrainToRoom({ ...item, x, y }, room);
    x = constrained.x;
    y = constrained.y;

    // Check collision with other furniture
    const testItem = { ...item, x, y };
    if (checkCollisionWithOthers(testItem, allFurniture)) {
      // Collision detected, revert to last valid position
      node.position({
        x: lastValidPos.x + halfWidth,
        y: lastValidPos.y + halfDepth,
      });
      return;
    }

    // No collision, update position
    node.position({
      x: x + halfWidth,
      y: y + halfDepth,
    });
    setLastValidPos({ x, y });

    // Update store immediately for real-time dimension updates
    onUpdate(item.id, { x, y });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const nodePos = node.position();
    const x = nodePos.x - halfWidth;
    const y = nodePos.y - halfDepth;
    onUpdate(item.id, { x, y });
    // Commit history after drag ends
    useSimulatorStore.getState().commitHistory();
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!isSelected || !isPlacementEnabled) return;

    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -1 : 1;
    const rotationStep = e.evt.shiftKey ? 1 : 15;
    const newRotation = (item.rotation + delta * rotationStep) % 360;

    // Check collision with new rotation
    const testItem = { ...item, rotation: newRotation };
    if (checkCollisionWithOthers(testItem, allFurniture)) {
      // Collision detected, don't rotate
      return;
    }

    onUpdate(item.id, { rotation: newRotation });
    // Commit history after rotation
    useSimulatorStore.getState().commitHistory();
  };

  const handleClick = () => {
    onSelect(item.id);
  };

  const handleDoubleClick = () => {
    onStartPlacement(item.id);
  };

  return (
    <Group
      ref={groupRef}
      x={item.x + halfWidth}
      y={item.y + halfDepth}
      offsetX={halfWidth}
      offsetY={halfDepth}
      draggable={isPlacementEnabled && !item.locked}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onWheel={handleWheel}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
    >
      <Rect
        width={item.width}
        height={item.depth}
        fill={item.color ?? DEFAULT_FURNITURE_COLOR}
        stroke={isSelected ? "#4A90E2" : DEFAULT_FURNITURE_STROKE}
        strokeWidth={isSelected ? 4 : 2}
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

// Pending furniture component (semi-transparent, shows collision status)
function PendingFurnitureItem({
  item,
  room,
  allFurniture,
  onUpdate,
}: PendingFurnitureItemProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [collisionPolygons, setCollisionPolygons] = useState<{ x: number; y: number }[][]>([]);
  const halfWidth = item.width / 2;
  const halfDepth = item.depth / 2;

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation(item.rotation);
    }
  }, [item.rotation]);

  // Calculate collision polygons whenever position or rotation changes
  useEffect(() => {
    const testItem = { ...item, id: "pending" } as FurnitureItem;
    const polygons = getCollisionPolygons(testItem, allFurniture);
    setCollisionPolygons(polygons);
  }, [item.x, item.y, item.rotation, item.width, item.depth, allFurniture]);

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const nodePos = node.position();
    let x = nodePos.x - halfWidth;
    let y = nodePos.y - halfDepth;

    // Apply snap
    const snapped = snapPosition(x, y, room);
    x = snapped.x;
    y = snapped.y;

    // Apply boundary constraints (but no collision check)
    const testItem = { ...item, id: "pending", x, y } as FurnitureItem;
    const constrained = constrainToRoom(testItem, room);
    x = constrained.x;
    y = constrained.y;

    node.position({
      x: x + halfWidth,
      y: y + halfDepth,
    });

    // Update store immediately
    onUpdate({ x, y });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const nodePos = node.position();
    const x = nodePos.x - halfWidth;
    const y = nodePos.y - halfDepth;
    onUpdate({ x, y });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -1 : 1;
    const rotationStep = e.evt.shiftKey ? 1 : 15;
    const newRotation = (item.rotation + delta * rotationStep) % 360;

    onUpdate({ rotation: newRotation });
  };

  return (
    <Group
      ref={groupRef}
      x={item.x + halfWidth}
      y={item.y + halfDepth}
      offsetX={halfWidth}
      offsetY={halfDepth}
      draggable={true}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onWheel={handleWheel}
    >
      {/* Base furniture with selected color */}
      <Rect
        width={item.width}
        height={item.depth}
        fill={item.color ?? DEFAULT_FURNITURE_COLOR}
        stroke={DEFAULT_FURNITURE_STROKE}
        strokeWidth={4}
        cornerRadius={4}
        dash={[10, 5]}
      />
      {/* Type-specific visual markers */}
      {renderFurnitureMarker(item as FurnitureItem)}
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
      {/* Collision areas in red */}
      {collisionPolygons.map((polygon, index) => {
        // Convert world coordinates to local coordinates (with rotation)
        const rad = -degToRad(item.rotation);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const points = polygon.flatMap((p) => {
          const centerX = item.x + halfWidth;
          const centerY = item.y + halfDepth;
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const rotatedX = dx * cos - dy * sin;
          const rotatedY = dx * sin + dy * cos;
          const localX = rotatedX + halfWidth;
          const localY = rotatedY + halfDepth;
          return [localX, localY];
        });

        return (
          <Line
            key={index}
            points={points}
            fill="#ff0000"
            stroke="#ff0000"
            strokeWidth={3}
            closed={true}
            listening={false}
          />
        );
      })}
    </Group>
  );
}
