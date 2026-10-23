import { useEffect, useRef, useState } from "react";
import { Circle, Group, Layer, Stage, Text, Wedge } from "react-konva";
import type Konva from "konva";
import { useSimulatorStore } from "../store/useSimulatorStore";
import {
  CAMERA_FOV_DEGREES,
  cameraWedgeRotation,
  showsCameraDirection,
} from "../domain/memory";
import { getStructureBounds } from "../scene3d/structure3dMath";
import { FloorPlanLayer } from "./FloorPlanLayer";
import { StructureLayer } from "./StructureLayer";
import { useCanvasSize } from "./useCanvasSize";
import "./StructureCanvas.css";

export function MemoryCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const { size, measured } = useCanvasSize(containerRef);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [viewport, setViewport] = useState({ x: 70, y: 70, scale: 0.08 });
  const structure = useSimulatorStore((state) => state.structure);
  const issues = useSimulatorStore((state) => state.structureIssues);
  const pins = useSimulatorStore((state) => state.memoryPins);
  const selectedPinId = useSimulatorStore(
    (state) => state.selectedMemoryPinId
  );
  const tool = useSimulatorStore((state) => state.structureTool);
  const addPin = useSimulatorStore((state) => state.addMemoryPin);
  const updatePin = useSimulatorStore((state) => state.updateMemoryPin);
  const selectPin = useSimulatorStore((state) => state.selectMemoryPin);
  const sources = useSimulatorStore((state) => state.floorPlanSources);
  const objectUrls = useSimulatorStore((state) => state.floorPlanObjectUrls);
  const activeSourceId = useSimulatorStore(
    (state) => state.activeFloorPlanSourceId
  );
  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? null;
  const bounds = getStructureBounds(structure);

  // 처음 실제 크기를 읽을 때와 구조가 바뀔 때만 맞춘다. 이후 크기 변화(인스펙터가
  // 길어져 캔버스가 늘어나는 경우 등)에는 사용자의 확대·이동을 유지한다.
  useEffect(() => {
    const padding = 70;
    const size = sizeRef.current;
    const scale = Math.max(
      0.02,
      Math.min(
        0.5,
        (size.width - padding * 2) / Math.max(1, bounds.width),
        (size.height - padding * 2) / Math.max(1, bounds.height)
      )
    );
    setViewport({
      scale,
      x: padding - bounds.minX * scale,
      y: padding - bounds.minY * scale,
    });
  }, [
    bounds.height,
    bounds.minX,
    bounds.minY,
    bounds.width,
    structure.id,
    measured,
  ]);

  const worldPointer = (): { x: number; y: number } | null => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  };

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const world = worldPointer();
    if (!world) return;
    const scale = Math.max(
      0.02,
      Math.min(
        0.8,
        viewport.scale * (event.evt.deltaY > 0 ? 0.88 : 1.12)
      )
    );
    setViewport({
      scale,
      x: pointer.x - world.x * scale,
      y: pointer.y - world.y * scale,
    });
  };

  return (
    <div className="structure-canvas" ref={containerRef}>
      <div className="structure-canvas-status">
        <strong>
          {tool === "memory-pin"
            ? "도면에서 기억을 남길 위치를 클릭하세요."
            : "기록 핀을 선택하거나 도면을 드래그해 둘러보세요."}
        </strong>
        <span>
          {Math.round(viewport.scale * 1000)}% · 기록 {pins.length}개
        </span>
      </div>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={tool !== "memory-pin"}
        onDragMove={(event) =>
          setViewport((current) => ({
            ...current,
            x: event.target.x(),
            y: event.target.y(),
          }))
        }
        onWheel={handleWheel}
        onClick={(event) => {
          if (event.target !== event.target.getStage()) return;
          if (tool === "memory-pin") {
            const position = worldPointer();
            if (position) addPin(position);
          } else {
            selectPin(null);
          }
        }}
      >
        <FloorPlanLayer
          source={activeSource}
          objectUrl={
            activeSource ? objectUrls[activeSource.assetId] : undefined
          }
          selected={false}
          onSelect={() => undefined}
          onMove={() => undefined}
        />
        <StructureLayer
          structure={structure}
          issues={issues}
          selected={null}
          scale={viewport.scale}
          interactive={false}
          onSelect={() => undefined}
          onMoveEndpoint={() => undefined}
          onMoveOpening={() => undefined}
        />
        <Layer>
          {pins.map((pin, index) => {
            const selected = pin.id === selectedPinId;
            const radius = (selected ? 18 : 15) / viewport.scale;
            return (
              <Group
                key={pin.id}
                x={pin.position.x}
                y={pin.position.y}
                draggable
                onClick={(event) => {
                  event.cancelBubble = true;
                  selectPin(pin.id);
                }}
                onDragEnd={(event) =>
                  updatePin(pin.id, {
                    position: { x: event.target.x(), y: event.target.y() },
                  })
                }
              >
                {showsCameraDirection(pin, selected) && (
                  <Wedge
                    radius={radius * 4}
                    angle={CAMERA_FOV_DEGREES}
                    rotation={cameraWedgeRotation(pin.cameraDirection ?? 0)}
                    fill={selected ? "rgba(249, 115, 22, 0.28)" : "rgba(37, 99, 235, 0.22)"}
                    stroke={selected ? "#f97316" : "#2563eb"}
                    strokeWidth={1.5 / viewport.scale}
                    listening={false}
                  />
                )}
                <Circle
                  radius={radius}
                  fill={selected ? "#f97316" : "#2563eb"}
                  stroke="#ffffff"
                  strokeWidth={4 / viewport.scale}
                  shadowColor="#0f172a"
                  shadowBlur={8 / viewport.scale}
                  shadowOpacity={0.25}
                />
                <Text
                  text={String(index + 1)}
                  width={radius * 2}
                  height={radius * 2}
                  x={-radius}
                  y={-radius}
                  align="center"
                  verticalAlign="middle"
                  fill="#ffffff"
                  fontStyle="bold"
                  fontSize={14 / viewport.scale}
                  listening={false}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
