import { useRef, useEffect, useState } from "react";
import { Layer, Rect, Text, Group, Circle, Line } from "react-konva";
import type Konva from "konva";
import type { FurnitureItem, Room, SelectedEntity } from "../types";
import { snapPosition, constrainToRoom, checkCollisionWithOthers, getCollisionPolygons, degToRad, buildAttachmentExcludeIds } from "../utils";
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

// Helper function to adjust color brightness
const adjustColor = (color: string, amount: number) => {
  const hex = color.replace('#', '');
  const rgb = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, ((rgb >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((rgb >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (rgb & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
};

// Render type-specific realistic furniture icons
const renderFurnitureMarker = (item: FurnitureItem) => {
  const cx = item.width / 2;
  const cy = item.depth / 2;
  const scale = Math.min(item.width, item.depth) / 100;
  const baseColor = item.color ?? DEFAULT_FURNITURE_COLOR;
  const darkColor = adjustColor(baseColor, -40);
  const lightColor = adjustColor(baseColor, 40);

  switch (item.type) {
    case "bed":
      // Realistic bed with headboard and pillow
      return (
        <>
          {/* Headboard */}
          <Rect
            x={item.width * 0.05}
            y={item.depth * 0.05}
            width={item.width * 0.9}
            height={item.depth * 0.15}
            fill={darkColor}
            cornerRadius={6}
            listening={false}
          />
          {/* Mattress */}
          <Rect
            x={item.width * 0.05}
            y={item.depth * 0.2}
            width={item.width * 0.9}
            height={item.depth * 0.7}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
          {/* Pillow */}
          <Rect
            x={item.width * 0.15}
            y={item.depth * 0.25}
            width={item.width * 0.7}
            height={item.depth * 0.2}
            fill={lightColor}
            cornerRadius={8}
            listening={false}
          />
        </>
      );
    case "desk":
      // Realistic desk with drawers
      return (
        <>
          {/* Desktop */}
          <Rect
            x={item.width * 0.05}
            y={item.depth * 0.15}
            width={item.width * 0.9}
            height={item.depth * 0.7}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={3}
            listening={false}
          />
          {/* Left drawer */}
          <Rect
            x={item.width * 0.1}
            y={item.depth * 0.3}
            width={item.width * 0.25}
            height={item.depth * 0.2}
            fill={lightColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={2}
            listening={false}
          />
          <Circle
            x={item.width * 0.225}
            y={item.depth * 0.4}
            radius={scale * 3}
            fill={darkColor}
            listening={false}
          />
          {/* Right drawer */}
          <Rect
            x={item.width * 0.65}
            y={item.depth * 0.3}
            width={item.width * 0.25}
            height={item.depth * 0.2}
            fill={lightColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={2}
            listening={false}
          />
          <Circle
            x={item.width * 0.775}
            y={item.depth * 0.4}
            radius={scale * 3}
            fill={darkColor}
            listening={false}
          />
        </>
      );
    case "chair":
      // Realistic chair with backrest and seat
      return (
        <>
          {/* Backrest */}
          <Rect
            x={item.width * 0.15}
            y={item.depth * 0.05}
            width={item.width * 0.7}
            height={item.depth * 0.2}
            fill={darkColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={6}
            listening={false}
          />
          {/* Seat */}
          <Rect
            x={item.width * 0.1}
            y={item.depth * 0.25}
            width={item.width * 0.8}
            height={item.depth * 0.5}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
          {/* Front legs indication */}
          <Circle
            x={item.width * 0.25}
            y={item.depth * 0.8}
            radius={scale * 4}
            fill={darkColor}
            listening={false}
          />
          <Circle
            x={item.width * 0.75}
            y={item.depth * 0.8}
            radius={scale * 4}
            fill={darkColor}
            listening={false}
          />
        </>
      );
    case "closet":
      // Realistic closet with doors
      return (
        <>
          {/* Body */}
          <Rect
            x={item.width * 0.05}
            y={item.depth * 0.05}
            width={item.width * 0.9}
            height={item.depth * 0.9}
            fill={darkColor}
            stroke={darkColor}
            strokeWidth={3}
            cornerRadius={3}
            listening={false}
          />
          {/* Left door */}
          <Rect
            x={item.width * 0.08}
            y={item.depth * 0.1}
            width={item.width * 0.4}
            height={item.depth * 0.8}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={2}
            listening={false}
          />
          <Circle
            x={item.width * 0.42}
            y={cy}
            radius={scale * 3}
            fill={lightColor}
            listening={false}
          />
          {/* Right door */}
          <Rect
            x={item.width * 0.52}
            y={item.depth * 0.1}
            width={item.width * 0.4}
            height={item.depth * 0.8}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={2}
            listening={false}
          />
          <Circle
            x={item.width * 0.58}
            y={cy}
            radius={scale * 3}
            fill={lightColor}
            listening={false}
          />
        </>
      );
    case "sofa":
      // Realistic sofa with cushions and armrests
      return (
        <>
          {/* Base */}
          <Rect
            x={item.width * 0.08}
            y={item.depth * 0.3}
            width={item.width * 0.84}
            height={item.depth * 0.6}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={6}
            listening={false}
          />
          {/* Backrest */}
          <Rect
            x={item.width * 0.08}
            y={item.depth * 0.1}
            width={item.width * 0.84}
            height={item.depth * 0.25}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={8}
            listening={false}
          />
          {/* Left armrest */}
          <Rect
            x={item.width * 0.03}
            y={item.depth * 0.15}
            width={item.width * 0.1}
            height={item.depth * 0.7}
            fill={darkColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
          {/* Right armrest */}
          <Rect
            x={item.width * 0.87}
            y={item.depth * 0.15}
            width={item.width * 0.1}
            height={item.depth * 0.7}
            fill={darkColor}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
          {/* Cushions */}
          <Circle
            x={item.width * 0.3}
            y={item.depth * 0.5}
            radius={Math.min(item.width, item.depth) * 0.12}
            fill={lightColor}
            listening={false}
          />
          <Circle
            x={item.width * 0.7}
            y={item.depth * 0.5}
            radius={Math.min(item.width, item.depth) * 0.12}
            fill={lightColor}
            listening={false}
          />
        </>
      );
    case "table":
      // Realistic table with legs
      return (
        <>
          {/* Tabletop */}
          <Rect
            x={item.width * 0.05}
            y={item.depth * 0.05}
            width={item.width * 0.9}
            height={item.depth * 0.9}
            fill={baseColor}
            stroke={darkColor}
            strokeWidth={3}
            cornerRadius={6}
            listening={false}
          />
          {/* Inner panel for depth effect */}
          <Rect
            x={item.width * 0.1}
            y={item.depth * 0.1}
            width={item.width * 0.8}
            height={item.depth * 0.8}
            stroke={darkColor}
            strokeWidth={2}
            cornerRadius={4}
            listening={false}
          />
          {/* Table legs */}
          <Circle
            x={item.width * 0.15}
            y={item.depth * 0.15}
            radius={scale * 5}
            fill={darkColor}
            listening={false}
          />
          <Circle
            x={item.width * 0.85}
            y={item.depth * 0.15}
            radius={scale * 5}
            fill={darkColor}
            listening={false}
          />
          <Circle
            x={item.width * 0.15}
            y={item.depth * 0.85}
            radius={scale * 5}
            fill={darkColor}
            listening={false}
          />
          <Circle
            x={item.width * 0.85}
            y={item.depth * 0.85}
            radius={scale * 5}
            fill={darkColor}
            listening={false}
          />
        </>
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
      {/* Attachment connection lines */}
      {furniture
        .filter((item) => item.parentId && item.id !== placingFurnitureId)
        .map((child) => {
          const parent = furniture.find((f) => f.id === child.parentId);
          if (!parent || parent.id === placingFurnitureId) return null;
          const childCx = child.x + child.width / 2;
          const childCy = child.y + child.depth / 2;
          const parentCx = parent.x + parent.width / 2;
          const parentCy = parent.y + parent.depth / 2;
          return (
            <Line
              key={`attach-${child.id}`}
              points={[childCx, childCy, parentCx, parentCy]}
              stroke="#e67e22"
              strokeWidth={2}
              dash={[6, 4]}
              opacity={0.6}
              listening={false}
            />
          );
        })}
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

    // Check collision with other furniture (exclude parent/children/siblings)
    const excludeIds = buildAttachmentExcludeIds(item.id, allFurniture);
    const testItem = { ...item, x, y };
    if (checkCollisionWithOthers(testItem, allFurniture, excludeIds)) {
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

    // Check collision with new rotation (exclude parent/children/siblings)
    const excludeIds = buildAttachmentExcludeIds(item.id, allFurniture);
    const testItem = { ...item, rotation: newRotation };
    if (checkCollisionWithOthers(testItem, allFurniture, excludeIds)) {
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
        fill="transparent"
        stroke={isSelected ? "#4A90E2" : item.parentId ? "#e67e22" : DEFAULT_FURNITURE_STROKE}
        strokeWidth={isSelected ? 4 : item.parentId ? 3 : 2}
        cornerRadius={4}
        dash={item.parentId && !isSelected ? [8, 4] : undefined}
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
      {/* Outer highlight border */}
      <Rect
        width={item.width}
        height={item.depth}
        stroke="#3b82f6"
        strokeWidth={20}
        cornerRadius={4}
        dash={[30, 15]}
        opacity={0.3}
        listening={false}
      />
      {/* Base furniture with selected color */}
      <Rect
        width={item.width}
        height={item.depth}
        fill="transparent"
        stroke="#3b82f6"
        strokeWidth={12}
        cornerRadius={4}
        dash={[25, 15]}
        shadowColor="#3b82f6"
        shadowBlur={20}
        shadowOpacity={0.8}
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
