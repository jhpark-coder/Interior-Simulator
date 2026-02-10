import "./Canvas2D.css";
import { useRef, useState, useEffect } from "react";
import { Stage } from "react-konva";
import type Konva from "konva";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { RoomLayer } from "./RoomLayer";
import { GridLayer } from "./GridLayer";
import { FurnitureLayer } from "./FurnitureLayer";
import { OpeningLayer } from "./OpeningLayer";
import { DimensionLayer } from "./DimensionLayer";

export function Canvas2D() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 100, y: 100 });
  const [scale, setScale] = useState(0.1);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const room = useSimulatorStore((state) => state.room);
  const furniture = useSimulatorStore((state) => state.furniture);
  const doors = useSimulatorStore((state) => state.doors);
  const windows = useSimulatorStore((state) => state.windows);
  const selectedEntity = useSimulatorStore((state) => state.selectedEntity);
  const pendingFurniture = useSimulatorStore((state) => state.pendingFurniture);
  const placingFurnitureId = useSimulatorStore((state) => state.placingFurnitureId);
  const placingFurniture = useSimulatorStore((state) => state.placingFurniture);
  const roomDimensionPlacement = useSimulatorStore((state) => state.roomDimensionPlacement);
  const selectEntity = useSimulatorStore((state) => state.selectEntity);
  const clearSelection = useSimulatorStore((state) => state.clearSelection);
  const startPlacementForFurniture = useSimulatorStore(
    (state) => state.startPlacementForFurniture
  );
  const updateFurniture = useSimulatorStore((state) => state.updateFurniture);
  const updatePendingFurniture = useSimulatorStore((state) => state.updatePendingFurniture);
  const updatePlacementFurniture = useSimulatorStore(
    (state) => state.updatePlacementFurniture
  );
  const updateDoor = useSimulatorStore((state) => state.updateDoor);
  const updateWindow = useSimulatorStore((state) => state.updateWindow);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Center room on initial load
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      const height = containerRef.current.offsetHeight;
      const roomCenterX = room.width / 2;
      const roomCenterY = room.height / 2;
      setStagePos({
        x: width / 2 - roomCenterX * scale,
        y: height / 2 - roomCenterY * scale,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle zoom with wheel
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    // During placement mode, wheel is reserved for furniture rotation.
    if (pendingFurniture || placingFurniture) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const viewportCenter = {
      x: stageSize.width / 2,
      y: stageSize.height / 2,
    };
    const worldPointAtCenter = {
      x: (viewportCenter.x - stage.x()) / oldScale,
      y: (viewportCenter.y - stage.y()) / oldScale,
    };

    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.03, Math.min(3, oldScale * delta));

    setScale(newScale);
    setStagePos({
      x: viewportCenter.x - worldPointAtCenter.x * newScale,
      y: viewportCenter.y - worldPointAtCenter.y * newScale,
    });
  };

  // Track space key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle panning with space + drag
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0 && isSpacePressed) {
      setIsPanning(true);
      e.evt.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      setStagePos({
        x: stagePos.x + e.evt.movementX,
        y: stagePos.y + e.evt.movementY,
      });
      e.evt.preventDefault();
    }
  };

  const handleRoomClick = () => {
    selectEntity({ kind: "room" });
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // 빈 공간(Stage 자체)을 클릭했을 때만 선택 해제
    if (e.target === e.target.getStage()) {
      clearSelection();
    }
  };

  const handleFurnitureSelect = (id: string) => {
    selectEntity({ kind: "furniture", id });
  };

  const handleOpeningSelect = (kind: "door" | "window", id: string) => {
    selectEntity({ kind, id });
  };

  const handleOpeningUpdate = (kind: "door" | "window", id: string, patch: any) => {
    if (kind === "door") {
      updateDoor(id, patch);
    } else {
      updateWindow(id, patch);
    }
  };

  const furnitureForDimensions =
    placingFurniture && placingFurnitureId
      ? furniture.map((item) =>
          item.id === placingFurnitureId ? { ...placingFurniture, id: placingFurnitureId } : item
        )
      : furniture;

  return (
    <div className="canvas-root">
      <div className="canvas-header">
        <div>
          <p className="canvas-kicker">2D Layout</p>
          <h2 className="canvas-title">
            Room {room.width} x {room.height} mm
          </h2>
        </div>
        <div className="canvas-meta">
          격자 {room.gridSize} mm · 스냅 {room.snapEnabled ? "켜짐" : "꺼짐"} ·
          줌 {Math.round(scale * 100)}% · 이동: Space + 드래그
        </div>
      </div>
      <div
        ref={containerRef}
        className="canvas-stage"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={scale}
          scaleY={scale}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClick={handleStageClick}
        >
          <RoomLayer room={room} onClick={handleRoomClick} />
          <GridLayer room={room} visible={true} />
          <OpeningLayer
            doors={doors}
            windows={windows}
            room={room}
            selectedEntity={selectedEntity}
            onSelect={handleOpeningSelect}
            onUpdate={handleOpeningUpdate}
          />
          <FurnitureLayer
            furniture={furniture}
            pendingFurniture={pendingFurniture}
            placingFurnitureId={placingFurnitureId}
            placingFurniture={placingFurniture}
            room={room}
            selectedEntity={selectedEntity}
            onSelect={handleFurnitureSelect}
            onStartPlacement={startPlacementForFurniture}
            onUpdate={updateFurniture}
            onUpdatePending={updatePendingFurniture}
            onUpdatePlacing={updatePlacementFurniture}
          />
          <DimensionLayer
            room={room}
            furniture={furnitureForDimensions}
            doors={doors}
            windows={windows}
            selectedEntity={selectedEntity}
            zoom={scale}
            roomDimensionPlacement={roomDimensionPlacement}
          />
        </Stage>
      </div>
    </div>
  );
}
