import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Layer, Line, Stage, Text } from "react-konva";
import type Konva from "konva";
import {
  projectPointToWall,
  snapPointToWallEndpoints,
  wallLength,
  type Vec2,
} from "../domain/structure";
import { imagePointToWorld, worldPointToImage } from "../domain/import";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { FloorPlanLayer, UNCALIBRATED_MM_PER_PIXEL } from "./FloorPlanLayer";
import { StructureLayer } from "./StructureLayer";
import { DetectionCandidateLayer } from "./DetectionCandidateLayer";
import "./StructureCanvas.css";

const MIN_SCALE = 0.015;
const MAX_SCALE = 0.8;
const ANGLE_STEP = Math.PI / 12;

function snapAngle(start: Vec2, point: Vec2): Vec2 {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return point;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / ANGLE_STEP) * ANGLE_STEP;
  return {
    x: start.x + Math.cos(snappedAngle) * length,
    y: start.y + Math.sin(snappedAngle) * length,
  };
}

function gridPoint(point: Vec2, gridSize: number): Vec2 {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

function getImagePixelPoint(
  worldPoint: Vec2,
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleMmPerPixel: number | null;
  }
): Vec2 {
  return worldPointToImage(worldPoint, {
    ...transform,
    scaleMmPerPixel:
      transform.scaleMmPerPixel ?? UNCALIBRATED_MM_PER_PIXEL,
  });
}

export function StructureCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 900, height: 650 });
  const [viewport, setViewport] = useState({ x: 80, y: 80, scale: 0.08 });
  const [draftStart, setDraftStart] = useState<Vec2 | null>(null);
  const [draftEnd, setDraftEnd] = useState<Vec2 | null>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<Vec2[]>([]);

  const structure = useSimulatorStore((state) => state.structure);
  const detectionCandidates = useSimulatorStore(
    (state) => state.detectionCandidates
  );
  const selectedDetectionCandidateId = useSimulatorStore(
    (state) => state.selectedDetectionCandidateId
  );
  const selectDetectionCandidate = useSimulatorStore(
    (state) => state.selectDetectionCandidate
  );
  const issues = useSimulatorStore((state) => state.structureIssues);
  const selected = useSimulatorStore(
    (state) => state.selectedStructureEntity
  );
  const tool = useSimulatorStore((state) => state.structureTool);
  const sources = useSimulatorStore((state) => state.floorPlanSources);
  const objectUrls = useSimulatorStore((state) => state.floorPlanObjectUrls);
  const activeSourceId = useSimulatorStore(
    (state) => state.activeFloorPlanSourceId
  );
  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? null;

  const fitStructure = () => {
    const candidatePoints = detectionCandidates.flatMap((candidate) => {
      if (candidate.kind === "wall") return [candidate.start, candidate.end];
      return [candidate.position];
    });
    const sourcePoints = activeSource
      ? [
          { x: 0, y: 0 },
          { x: activeSource.widthPx, y: 0 },
          { x: activeSource.widthPx, y: activeSource.heightPx },
          { x: 0, y: activeSource.heightPx },
        ].map((point) =>
          imagePointToWorld(point, {
            ...activeSource.transform,
            scaleMmPerPixel:
              activeSource.transform.scaleMmPerPixel ??
              UNCALIBRATED_MM_PER_PIXEL,
          })
        )
      : [];
    const points = [
      ...structure.walls.flatMap((wall) => [wall.start, wall.end]),
      ...candidatePoints,
      ...sourcePoints,
    ];
    if (points.length === 0) {
      setViewport({ x: 80, y: 80, scale: 0.08 });
      return;
    }
    const minX = Math.min(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxX = Math.max(...points.map((point) => point.x));
    const maxY = Math.max(...points.map((point) => point.y));
    const padding = 72;
    const scale = Math.max(
      MIN_SCALE,
      Math.min(
        MAX_SCALE,
        (size.width - padding * 2) / Math.max(1, maxX - minX),
        (size.height - padding * 2) / Math.max(1, maxY - minY)
      )
    );
    setViewport({
      scale,
      x: padding - minX * scale,
      y: padding - minY * scale,
    });
  };

  const addWall = useSimulatorStore((state) => state.addWall);
  const addOpening = useSimulatorStore(
    (state) => state.addStructureOpening
  );
  const moveWallEndpoint = useSimulatorStore(
    (state) => state.moveWallEndpoint
  );
  const updateOpening = useSimulatorStore(
    (state) => state.updateStructureOpening
  );
  const selectEntity = useSimulatorStore(
    (state) => state.selectStructureEntity
  );
  const updateSource = useSimulatorStore(
    (state) => state.updateFloorPlanSource
  );
  const addCalibrationAnchor = useSimulatorStore(
    (state) => state.addCalibrationAnchor
  );
  const removeWall = useSimulatorStore((state) => state.removeWall);
  const removeOpening = useSimulatorStore(
    (state) => state.removeStructureOpening
  );
  const undoStructure = useSimulatorStore((state) => state.undoStructure);
  const redoStructure = useSimulatorStore((state) => state.redoStructure);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(420, entry.contentRect.height),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setDraftStart(null);
    setDraftEnd(null);
    setCalibrationPoints([]);
  }, [tool]);

  useEffect(() => {
    fitStructure();
    // A different structure or a resized canvas needs a fresh fit. Individual
    // wall edits keep the user's current zoom and pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure.id, size.width, size.height]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key === "Escape") {
        setDraftStart(null);
        setDraftEnd(null);
        setCalibrationPoints([]);
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selected?.kind === "wall") removeWall(selected.id);
        if (selected?.kind === "structure-opening") {
          removeOpening(selected.id);
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoStructure();
        else undoStructure();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    redoStructure,
    removeOpening,
    removeWall,
    selected,
    undoStructure,
  ]);

  const pointerWorld = (): Vec2 | null => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  };

  const snappedPoint = (raw: Vec2, start?: Vec2): Vec2 => {
    const angular = start ? snapAngle(start, raw) : raw;
    const gridded = gridPoint(angular, 100);
    return snapPointToWallEndpoints(
      gridded,
      structure.walls,
      14 / viewport.scale
    );
  };

  const handlePointerMove = () => {
    if (tool !== "wall" || !draftStart) return;
    const raw = pointerWorld();
    if (!raw) return;
    setDraftEnd(snappedPoint(raw, draftStart));
  };

  const handleCanvasClick = (
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    const raw = pointerWorld();
    if (!raw) return;

    if (tool === "select") {
      if (event.target !== event.target.getStage()) return;
      selectEntity(null);
      return;
    }

    if (tool === "wall") {
      if (!draftStart) {
        const start = snappedPoint(raw);
        setDraftStart(start);
        setDraftEnd(start);
        return;
      }
      const end = snappedPoint(raw, draftStart);
      const id = addWall(draftStart, end);
      if (id) {
        setDraftStart(end);
        setDraftEnd(end);
      }
      return;
    }

    if (tool === "door" || tool === "window") {
      const nearest = structure.walls
        .map((wall) => ({ wall, projection: projectPointToWall(raw, wall) }))
        .sort((a, b) => a.projection.distance - b.projection.distance)[0];
      if (!nearest || nearest.projection.distance > 24 / viewport.scale) {
        return;
      }
      const width = tool === "door" ? 900 : 1200;
      addOpening({
        kind: tool,
        wallId: nearest.wall.id,
        offset: Math.max(
          0,
          Math.min(
            wallLength(nearest.wall) - width,
            nearest.projection.offset - width / 2
          )
        ),
        width,
        height: tool === "door" ? 2100 : 1200,
        sillHeight: tool === "door" ? 0 : 900,
        doorType: tool === "door" ? "swing" : undefined,
        hinge: tool === "door" ? "left" : undefined,
        swing: tool === "door" ? "inward" : undefined,
        openAngle: tool === "door" ? 90 : undefined,
        thickness: tool === "door" ? 40 : undefined,
      });
      return;
    }

    if (tool === "calibrate" && activeSource) {
      const nextPoints = [...calibrationPoints, raw].slice(-2);
      setCalibrationPoints(nextPoints);
      if (nextPoints.length === 2) {
        const entered = window.prompt(
          "선택한 두 점 사이의 실제 길이를 mm로 입력하세요.",
          "3000"
        );
        const realLengthMm = Number(entered);
        if (entered && Number.isFinite(realLengthMm) && realLengthMm > 0) {
          addCalibrationAnchor(activeSource.id, {
            startPixel: getImagePixelPoint(
              nextPoints[0],
              activeSource.transform
            ),
            endPixel: getImagePixelPoint(nextPoints[1], activeSource.transform),
            realLengthMm,
          });
        }
        setCalibrationPoints([]);
      }
    }
  };

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;
    const oldScale = viewport.scale;
    const worldPoint = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };
    const direction = event.evt.deltaY > 0 ? 0.88 : 1.12;
    const scale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, oldScale * direction)
    );
    setViewport({
      scale,
      x: pointer.x - worldPoint.x * scale,
      y: pointer.y - worldPoint.y * scale,
    });
  };

  const activeObjectUrl = activeSource
    ? objectUrls[activeSource.assetId]
    : undefined;
  const hint = useMemo(() => {
    if (tool === "wall") {
      return draftStart
        ? "다음 끝점을 클릭하세요. Esc로 연속 그리기를 종료합니다."
        : "벽의 시작점을 클릭하세요.";
    }
    if (tool === "calibrate") {
      return `축척 기준점 ${calibrationPoints.length}/2 — 평면도의 치수선 양 끝을 클릭하세요.`;
    }
    if (tool === "pan") return "캔버스를 드래그해 이동하고 휠로 확대·축소합니다.";
    return "벽·방·개구부를 선택해 오른쪽에서 수정합니다.";
  }, [calibrationPoints.length, draftStart, tool]);

  return (
    <div className="structure-canvas" ref={containerRef}>
      <div className="structure-canvas-status">
        <strong>{hint}</strong>
        <span>
          {Math.round(viewport.scale * 1000)}% · 벽 {structure.walls.length}개 ·
          방 {structure.rooms.length}개
        </span>
        <button onClick={fitStructure}>전체 보기</button>
      </div>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable={tool === "pan"}
        onDragMove={(event) =>
          setViewport((current) => ({
            ...current,
            x: event.target.x(),
            y: event.target.y(),
          }))
        }
        onMouseMove={handlePointerMove}
        onClick={handleCanvasClick}
        onTap={handleCanvasClick}
        onWheel={handleWheel}
        onContextMenu={(event) => {
          event.evt.preventDefault();
          setDraftStart(null);
          setDraftEnd(null);
        }}
      >
        <FloorPlanLayer
          source={activeSource}
          objectUrl={activeObjectUrl}
          selected={false}
          onSelect={() => undefined}
          onMove={(x, y) => {
            if (!activeSource) return;
            updateSource(activeSource.id, {
              transform: { ...activeSource.transform, x, y },
            });
          }}
        />
        <StructureLayer
          structure={structure}
          issues={issues}
          selected={selected}
          scale={viewport.scale}
          interactive={tool === "select"}
          onSelect={selectEntity}
          onMoveEndpoint={moveWallEndpoint}
          onMoveOpening={(id, offset) => updateOpening(id, { offset })}
        />
        <DetectionCandidateLayer
          candidates={detectionCandidates}
          selectedId={selectedDetectionCandidateId}
          scale={viewport.scale}
          onSelect={selectDetectionCandidate}
        />
        <Layer listening={false}>
          {draftStart && draftEnd && (
            <Line
              points={[
                draftStart.x,
                draftStart.y,
                draftEnd.x,
                draftEnd.y,
              ]}
              stroke="#2563eb"
              strokeWidth={120}
              dash={[20 / viewport.scale, 12 / viewport.scale]}
              opacity={0.75}
            />
          )}
          {calibrationPoints.map((point, index) => (
            <Circle
              key={`${point.x}:${point.y}:${index}`}
              x={point.x}
              y={point.y}
              radius={7 / viewport.scale}
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={2 / viewport.scale}
            />
          ))}
          {calibrationPoints.length === 2 && (
            <Line
              points={calibrationPoints.flatMap((point) => [point.x, point.y])}
              stroke="#ef4444"
              strokeWidth={3 / viewport.scale}
            />
          )}
          {structure.walls.length === 0 && (
            <Text
              x={0}
              y={0}
              width={5000}
              text="평면도를 불러오거나 벽 도구로 구조를 그려보세요."
              fontSize={240}
              fill="#64748b"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
