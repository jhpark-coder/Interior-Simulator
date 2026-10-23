import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage } from "react-konva";
import type Konva from "konva";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { getStructureBounds } from "../scene3d/structure3dMath";
import { findMisplacedFurniture } from "../utils";
import { FurnitureLayer } from "../components/FurnitureLayer";
import { SnapToggle } from "../components/shell/SnapToggle";
import { FloorPlanLayer } from "./FloorPlanLayer";
import { StructureLayer } from "./StructureLayer";
import { useCanvasSize } from "./useCanvasSize";
import "./StructureCanvas.css";

export function ScenarioCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const { size, measured } = useCanvasSize(containerRef);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [viewport, setViewport] = useState({ x: 70, y: 70, scale: 0.08 });

  const structure = useSimulatorStore((state) => state.structure);
  const issues = useSimulatorStore((state) => state.structureIssues);
  const room = useSimulatorStore((state) => state.room);
  const setRoom = useSimulatorStore((state) => state.setRoom);
  const furniture = useSimulatorStore((state) => state.furniture);
  const materials = useSimulatorStore((state) => state.activeMaterials);
  const pendingFurniture = useSimulatorStore(
    (state) => state.pendingFurniture
  );
  const placingFurnitureId = useSimulatorStore(
    (state) => state.placingFurnitureId
  );
  const placingFurniture = useSimulatorStore(
    (state) => state.placingFurniture
  );
  const selectedEntity = useSimulatorStore((state) => state.selectedEntity);
  const selectEntity = useSimulatorStore((state) => state.selectEntity);
  const clearSelection = useSimulatorStore((state) => state.clearSelection);
  const startPlacement = useSimulatorStore(
    (state) => state.startPlacementForFurniture
  );
  const updateFurniture = useSimulatorStore(
    (state) => state.updateFurniture
  );
  const updatePending = useSimulatorStore(
    (state) => state.updatePendingFurniture
  );
  const updatePlacing = useSimulatorStore(
    (state) => state.updatePlacementFurniture
  );
  const sources = useSimulatorStore((state) => state.floorPlanSources);
  const objectUrls = useSimulatorStore((state) => state.floorPlanObjectUrls);
  const activeSourceId = useSimulatorStore(
    (state) => state.activeFloorPlanSourceId
  );
  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? null;
  const bounds = getStructureBounds(structure);
  const misplacedIds = useMemo(
    () => new Set(findMisplacedFurniture(furniture, structure).map((item) => item.id)),
    [furniture, structure]
  );

  useEffect(() => {
    const width = Math.max(1000, bounds.maxX, bounds.width);
    const height = Math.max(1000, bounds.maxY, bounds.height);
    if (room.width !== width || room.height !== height) {
      setRoom({ width, height, ceilingHeight: structure.ceilingHeight });
    }
  }, [
    bounds.height,
    bounds.maxX,
    bounds.maxY,
    bounds.width,
    room.height,
    room.width,
    setRoom,
    structure.ceilingHeight,
  ]);

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

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    if (pendingFurniture || placingFurniture) return;
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const world = {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
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

  const handleFurnitureSelect = useCallback(
    (id: string) => selectEntity({ kind: "furniture", id }),
    [selectEntity]
  );

  return (
    <div className="structure-canvas" ref={containerRef}>
      <div className="structure-canvas-status">
        <strong>
          가구를 배치하고 드래그해 이동하세요. 배치안은 구조와 별도로 저장됩니다.
        </strong>
        <span>
          {Math.round(viewport.scale * 1000)}% · 가구 {furniture.length}개
        </span>
        <SnapToggle />
      </div>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={!pendingFurniture && !placingFurniture}
        onDragMove={(event) =>
          setViewport((current) => ({
            ...current,
            x: event.target.x(),
            y: event.target.y(),
          }))
        }
        onWheel={handleWheel}
        onClick={(event) => {
          if (event.target === event.target.getStage()) clearSelection();
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
          materials={materials}
          onSelect={() => undefined}
          onMoveEndpoint={() => undefined}
          onMoveOpening={() => undefined}
        />
        <FurnitureLayer
          furniture={furniture}
          pendingFurniture={pendingFurniture}
          placingFurnitureId={placingFurnitureId}
          placingFurniture={placingFurniture}
          room={room}
          selectedEntity={selectedEntity}
          onSelect={handleFurnitureSelect}
          onStartPlacement={startPlacement}
          onUpdate={updateFurniture}
          onUpdatePending={updatePending}
          onUpdatePlacing={updatePlacing}
          misplacedIds={misplacedIds}
        />
      </Stage>
    </div>
  );
}
