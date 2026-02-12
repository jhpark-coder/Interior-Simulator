import { useState, useEffect, useCallback } from "react";
import "./InspectorPanel.css";
import { useSimulatorStore } from "../store/useSimulatorStore";
import type { Room, WallSide, FurnitureType } from "../types";
import { DEFAULT_FURNITURE_COLOR } from "../constants";

const MM_PER_INCH = 25.4;
const DIAG = Math.sqrt(16 * 16 + 9 * 9); // ≈ 18.358

function isMonitorType(type: FurnitureType): boolean {
  return type === "monitor-stand" || type === "monitor-arm";
}

function inchesToDimensions(
  inches: number,
  type: FurnitureType,
  name: string,
): { width?: number; depth?: number; height?: number } {
  const monitorW = (inches * MM_PER_INCH * 16) / DIAG;
  const monitorH = (inches * MM_PER_INCH * 9) / DIAG;

  if (type === "monitor-stand") {
    return { width: monitorW / 0.92, height: monitorH / 0.6 };
  }
  // monitor-arm
  if (name.includes("기둥")) {
    return { depth: monitorW / 0.85, height: monitorH / 0.45 };
  }
  return { depth: monitorW / 0.85, height: monitorH / 0.5 };
}

function dimensionsToInches(
  type: FurnitureType,
  name: string,
  width: number,
  depth: number,
  height: number,
): number {
  let monitorW: number;
  let monitorH: number;

  if (type === "monitor-stand") {
    monitorW = width * 0.92;
    monitorH = height * 0.6;
  } else if (name.includes("기둥")) {
    monitorW = depth * 0.85;
    monitorH = height * 0.45;
  } else {
    monitorW = depth * 0.85;
    monitorH = height * 0.5;
  }

  const diagMM = Math.sqrt(monitorW * monitorW + monitorH * monitorH);
  return diagMM / MM_PER_INCH;
}

const wallLabels: Record<WallSide, string> = {
  north: "북쪽",
  east: "동쪽",
  south: "남쪽",
  west: "서쪽",
};

function DeferredNumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = useCallback(() => {
    const num = Number(localValue);
    if (!Number.isNaN(num)) {
      onChange(num);
    } else {
      setLocalValue(String(value));
    }
  }, [localValue, onChange, value]);

  return (
    <input
      type="number"
      value={localValue}
      min={0}
      step={10}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}

const numberField = (
  label: string,
  value: number,
  onChange: (next: number) => void
) => (
  <label className="inspector-field">
    <span>{label}</span>
    <DeferredNumberInput value={value} onChange={onChange} />
  </label>
);

const colorField = (
  label: string,
  value: string,
  onChange: (next: string) => void
) => (
  <label className="inspector-field">
    <span>{label}</span>
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

export function InspectorPanel() {
  const room = useSimulatorStore((state) => state.room);
  const furniture = useSimulatorStore((state) => state.furniture);
  const doors = useSimulatorStore((state) => state.doors);
  const windows = useSimulatorStore((state) => state.windows);
  const selected = useSimulatorStore((state) => state.selectedEntity);
  const pendingFurniture = useSimulatorStore((state) => state.pendingFurniture);
  const pendingDoor = useSimulatorStore((state) => state.pendingDoor);
  const pendingWindow = useSimulatorStore((state) => state.pendingWindow);
  const placingFurnitureId = useSimulatorStore((state) => state.placingFurnitureId);
  const placingFurniture = useSimulatorStore((state) => state.placingFurniture);
  const setRoom = useSimulatorStore((state) => state.setRoom);
  const startPlacementForFurniture = useSimulatorStore(
    (state) => state.startPlacementForFurniture
  );
  const updateFurniture = useSimulatorStore((state) => state.updateFurniture);
  const removeFurniture = useSimulatorStore((state) => state.removeFurniture);
  const updateDoor = useSimulatorStore((state) => state.updateDoor);
  const removeDoor = useSimulatorStore((state) => state.removeDoor);
  const updateWindow = useSimulatorStore((state) => state.updateWindow);
  const removeWindow = useSimulatorStore((state) => state.removeWindow);
  const updatePendingFurniture = useSimulatorStore((state) => state.updatePendingFurniture);
  const commitPendingFurniture = useSimulatorStore((state) => state.commitPendingFurniture);
  const updatePlacementFurniture = useSimulatorStore(
    (state) => state.updatePlacementFurniture
  );
  const commitPlacementFurniture = useSimulatorStore(
    (state) => state.commitPlacementFurniture
  );
  const cancelPlacementFurniture = useSimulatorStore(
    (state) => state.cancelPlacementFurniture
  );
  const updatePendingDoor = useSimulatorStore((state) => state.updatePendingDoor);
  const commitPendingDoor = useSimulatorStore((state) => state.commitPendingDoor);
  const updatePendingWindow = useSimulatorStore((state) => state.updatePendingWindow);
  const commitPendingWindow = useSimulatorStore((state) => state.commitPendingWindow);
  const cancelPending = useSimulatorStore((state) => state.cancelPending);
  const commitHistory = useSimulatorStore((state) => state.commitHistory);
  const validationErrors = useSimulatorStore((state) => state.validationErrors);

  const updateRoom = (patch: Partial<Room>) => setRoom(patch);

  const selectedFurniture =
    selected?.kind === "furniture"
      ? furniture.find((item) => item.id === selected.id)
      : null;

  const selectedDoor =
    selected?.kind === "door" ? doors.find((d) => d.id === selected.id) : null;

  const selectedWindow =
    selected?.kind === "window"
      ? windows.find((w) => w.id === selected.id)
      : null;
  const placingOriginalFurniture = placingFurnitureId
    ? furniture.find((item) => item.id === placingFurnitureId)
    : null;

  const normalizeRotation = (angle: number) => ((angle % 360) + 360) % 360;

  const rotateSelectedFurniture = (delta: number) => {
    if (!selectedFurniture) return;
    updateFurniture(selectedFurniture.id, {
      rotation: normalizeRotation(selectedFurniture.rotation + delta),
    });
    commitHistory();
  };

  const rotatePendingFurniture = (delta: number) => {
    if (!pendingFurniture) return;
    updatePendingFurniture({
      rotation: normalizeRotation(pendingFurniture.rotation + delta),
    });
  };

  const rotatePlacingFurniture = (delta: number) => {
    if (!placingFurniture) return;
    updatePlacementFurniture({
      rotation: normalizeRotation(placingFurniture.rotation + delta),
    });
  };

  // Determine what to show
  const hasPending = pendingFurniture || pendingDoor || pendingWindow || placingFurniture;
  const showRoom = !hasPending && selected?.kind === "room";
  const showFurniture = !hasPending && selectedFurniture;
  const showDoor = !hasPending && selectedDoor;
  const showWindow = !hasPending && selectedWindow;
  const showEmpty = !hasPending && !selected;

  return (
    <div className="inspector-panel">
      {/* Placement Mode for Existing Furniture */}
      {placingFurniture && (
        <>
          <div>
            <p className="panel-kicker">배치 모드</p>
            <h2 className="panel-title">
              {placingOriginalFurniture?.name ?? placingFurniture.name}
            </h2>
          </div>
          <div className="inspector-grid">
            {numberField("X (mm)", Math.round(placingFurniture.x), (next) =>
              updatePlacementFurniture({ x: next })
            )}
            {numberField("Y (mm)", Math.round(placingFurniture.y), (next) =>
              updatePlacementFurniture({ y: next })
            )}
            {numberField("너비 (mm)", placingFurniture.width, (next) =>
              updatePlacementFurniture({ width: Math.max(next, 100) })
            )}
            {numberField("깊이 (mm)", placingFurniture.depth, (next) =>
              updatePlacementFurniture({ depth: Math.max(next, 100) })
            )}
            {numberField("높이 (mm)", placingFurniture.height, (next) =>
              updatePlacementFurniture({ height: Math.max(next, 100) })
            )}
            {numberField("회전 (도)", Math.round(placingFurniture.rotation), (next) =>
              updatePlacementFurniture({ rotation: normalizeRotation(next) })
            )}
            {colorField("색상", placingFurniture.color ?? DEFAULT_FURNITURE_COLOR, (next) =>
              updatePlacementFurniture({ color: next })
            )}
            {isMonitorType(placingFurniture.type) &&
              numberField(
                "인치",
                Math.round(
                  dimensionsToInches(
                    placingFurniture.type,
                    placingFurniture.name,
                    placingFurniture.width,
                    placingFurniture.depth,
                    placingFurniture.height,
                  ) * 10,
                ) / 10,
                (next) => {
                  const dims = inchesToDimensions(
                    Math.max(next, 10),
                    placingFurniture.type,
                    placingFurniture.name,
                  );
                  updatePlacementFurniture(dims);
                },
              )}
          </div>
          {isMonitorType(placingFurniture.type) && (
            <button
              type="button"
              onClick={() =>
                updatePlacementFurniture({ pivoted: !placingFurniture.pivoted })
              }
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: placingFurniture.pivoted ? "#4A90E2" : "#ddd",
                color: placingFurniture.pivoted ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              피벗 전환 {placingFurniture.pivoted ? "(세로)" : "(가로)"}
            </button>
          )}
          <div className="inspector-rotate-actions">
            <button type="button" onClick={() => rotatePlacingFurniture(-15)}>
              -15°
            </button>
            <button type="button" onClick={() => rotatePlacingFurniture(15)}>
              +15°
            </button>
            <button type="button" onClick={() => rotatePlacingFurniture(-90)}>
              -90°
            </button>
            <button type="button" onClick={() => rotatePlacingFurniture(90)}>
              +90°
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={commitPlacementFurniture}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#1f8f4f",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              배치하기
            </button>
            <button
              onClick={cancelPlacementFurniture}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              취소
            </button>
          </div>
        </>
      )}

      {/* Pending Furniture */}
      {pendingFurniture && (
        <>
          <div>
            <p className="panel-kicker">추가 대기 중</p>
            <h2 className="panel-title">{pendingFurniture.name}</h2>
          </div>
          <div className="inspector-grid">
            {numberField("X (mm)", Math.round(pendingFurniture.x), (next) =>
              updatePendingFurniture({ x: next })
            )}
            {numberField("Y (mm)", Math.round(pendingFurniture.y), (next) =>
              updatePendingFurniture({ y: next })
            )}
            {numberField("너비 (mm)", pendingFurniture.width, (next) =>
              updatePendingFurniture({ width: Math.max(next, 100) })
            )}
            {numberField("깊이 (mm)", pendingFurniture.depth, (next) =>
              updatePendingFurniture({ depth: Math.max(next, 100) })
            )}
            {numberField("높이 (mm)", pendingFurniture.height, (next) =>
              updatePendingFurniture({ height: Math.max(next, 100) })
            )}
            {numberField("회전 (도)", Math.round(pendingFurniture.rotation), (next) =>
              updatePendingFurniture({ rotation: normalizeRotation(next) })
            )}
            {colorField("색상", pendingFurniture.color ?? DEFAULT_FURNITURE_COLOR, (next) =>
              updatePendingFurniture({ color: next })
            )}
            {isMonitorType(pendingFurniture.type) &&
              numberField(
                "인치",
                Math.round(
                  dimensionsToInches(
                    pendingFurniture.type,
                    pendingFurniture.name,
                    pendingFurniture.width,
                    pendingFurniture.depth,
                    pendingFurniture.height,
                  ) * 10,
                ) / 10,
                (next) => {
                  const dims = inchesToDimensions(
                    Math.max(next, 10),
                    pendingFurniture.type,
                    pendingFurniture.name,
                  );
                  updatePendingFurniture(dims);
                },
              )}
          </div>
          {isMonitorType(pendingFurniture.type) && (
            <button
              type="button"
              onClick={() =>
                updatePendingFurniture({ pivoted: !pendingFurniture.pivoted })
              }
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: pendingFurniture.pivoted ? "#4A90E2" : "#ddd",
                color: pendingFurniture.pivoted ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              피벗 전환 {pendingFurniture.pivoted ? "(세로)" : "(가로)"}
            </button>
          )}
          <div className="inspector-rotate-actions">
            <button type="button" onClick={() => rotatePendingFurniture(-15)}>
              -15°
            </button>
            <button type="button" onClick={() => rotatePendingFurniture(15)}>
              +15°
            </button>
            <button type="button" onClick={() => rotatePendingFurniture(-90)}>
              -90°
            </button>
            <button type="button" onClick={() => rotatePendingFurniture(90)}>
              +90°
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={commitPendingFurniture}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              추가
            </button>
            <button
              onClick={cancelPending}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              취소
            </button>
          </div>
        </>
      )}

      {/* Pending Door */}
      {pendingDoor && (
        <>
          <div>
            <p className="panel-kicker">추가 대기 중</p>
            <h2 className="panel-title">{wallLabels[pendingDoor.wall]} 벽의 문</h2>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <span>문 타입:</span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => updatePendingDoor({ doorType: "swing" })}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  background: pendingDoor.doorType === "swing" ? "#4A90E2" : "#ddd",
                  color: pendingDoor.doorType === "swing" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                여닫이문
              </button>
              <button
                onClick={() => updatePendingDoor({ doorType: "sliding" })}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  background: pendingDoor.doorType === "sliding" ? "#4A90E2" : "#ddd",
                  color: pendingDoor.doorType === "sliding" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                미닫이문
              </button>
            </div>
          </div>
          <div className="inspector-grid">
            {numberField("위치 (mm)", Math.round(pendingDoor.offset), (next) =>
              updatePendingDoor({ offset: next })
            )}
            {numberField("너비 (mm)", pendingDoor.width, (next) =>
              updatePendingDoor({ width: Math.max(next, 500) })
            )}
            {numberField("높이 (mm)", pendingDoor.height, (next) =>
              updatePendingDoor({ height: Math.max(next, 1800) })
            )}
            {pendingDoor.doorType === "swing" && numberField("개폐 각도 (도)", pendingDoor.openAngle, (next) =>
              updatePendingDoor({ openAngle: Math.max(0, Math.min(120, next)) })
            )}
            {colorField("문 색상", pendingDoor.color ?? "#654321", (next) =>
              updatePendingDoor({ color: next })
            )}
          </div>
          {pendingDoor.doorType === "swing" && (
            <>
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  <span>경첩:</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => updatePendingDoor({ hinge: "left" })}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: pendingDoor.hinge === "left" ? "#4A90E2" : "#ddd",
                      color: pendingDoor.hinge === "left" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    왼쪽
                  </button>
                  <button
                    onClick={() => updatePendingDoor({ hinge: "right" })}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: pendingDoor.hinge === "right" ? "#4A90E2" : "#ddd",
                      color: pendingDoor.hinge === "right" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    오른쪽
                  </button>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  <span>열림 방향:</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => updatePendingDoor({ swing: "inward" })}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: pendingDoor.swing === "inward" ? "#4A90E2" : "#ddd",
                      color: pendingDoor.swing === "inward" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    안쪽
                  </button>
                  <button
                    onClick={() => updatePendingDoor({ swing: "outward" })}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: pendingDoor.swing === "outward" ? "#4A90E2" : "#ddd",
                      color: pendingDoor.swing === "outward" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    바깥쪽
                  </button>
                </div>
              </div>
            </>
          )}
          {pendingDoor.doorType === "sliding" && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                <span>슬라이드 방향:</span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => updatePendingDoor({ slideDirection: "left" })}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    background: pendingDoor.slideDirection === "left" ? "#4A90E2" : "#ddd",
                    color: pendingDoor.slideDirection === "left" ? "white" : "#333",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  왼쪽
                </button>
                <button
                  onClick={() => updatePendingDoor({ slideDirection: "right" })}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    background: pendingDoor.slideDirection === "right" ? "#4A90E2" : "#ddd",
                    color: pendingDoor.slideDirection === "right" ? "white" : "#333",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  오른쪽
                </button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={commitPendingDoor}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              추가
            </button>
            <button
              onClick={cancelPending}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              취소
            </button>
          </div>
        </>
      )}

      {/* Pending Window */}
      {pendingWindow && (
        <>
          <div>
            <p className="panel-kicker">추가 대기 중</p>
            <h2 className="panel-title">{wallLabels[pendingWindow.wall]} 벽의 창문</h2>
          </div>
          <div className="inspector-grid">
            {numberField("위치 (mm)", Math.round(pendingWindow.offset), (next) =>
              updatePendingWindow({ offset: next })
            )}
            {numberField("너비 (mm)", pendingWindow.width, (next) =>
              updatePendingWindow({ width: Math.max(next, 300) })
            )}
            {numberField("높이 (mm)", pendingWindow.height, (next) =>
              updatePendingWindow({ height: Math.max(next, 300) })
            )}
            {numberField("창턱 높이 (mm)", pendingWindow.sillHeight, (next) =>
              updatePendingWindow({ sillHeight: Math.max(next, 0) })
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={commitPendingWindow}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              추가
            </button>
            <button
              onClick={cancelPending}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              취소
            </button>
          </div>
        </>
      )}

      {/* Room Settings */}
      {showRoom && (
        <>
          <div>
            <p className="panel-kicker">속성</p>
            <h2 className="panel-title">방 설정</h2>
          </div>
          <div className="inspector-grid">
            {numberField("너비 (mm)", room.width, (next) =>
              updateRoom({ width: Math.max(next, 1000) })
            )}
            {numberField("높이 (mm)", room.height, (next) =>
              updateRoom({ height: Math.max(next, 1000) })
            )}
            {numberField("벽 두께 (mm)", room.wallThickness, (next) =>
              updateRoom({ wallThickness: Math.max(next, 50) })
            )}
            {numberField("천장 높이 (mm)", room.ceilingHeight, (next) =>
              updateRoom({ ceilingHeight: Math.max(next, 2000) })
            )}
            {numberField("격자 크기 (mm)", room.gridSize, (next) =>
              updateRoom({ gridSize: Math.max(next, 50) })
            )}
            {colorField("벽 색상", room.wallColor ?? "#b0b0b0", (next) =>
              updateRoom({ wallColor: next })
            )}
            {colorField("바닥 색상", room.floorColor ?? "#c4a882", (next) =>
              updateRoom({ floorColor: next })
            )}
          </div>
          <div className="inspector-toggle">
            <span>격자 스냅</span>
            <button
              className={room.snapEnabled ? "toggle-on" : "toggle-off"}
              onClick={() => updateRoom({ snapEnabled: !room.snapEnabled })}
            >
              {room.snapEnabled ? "활성화" : "비활성화"}
            </button>
          </div>
        </>
      )}

      {/* Selected Furniture */}
      {showFurniture && selectedFurniture && (
        <>
          <div>
            <p className="panel-kicker">선택됨</p>
            <h2 className="panel-title">{selectedFurniture.name}</h2>
            <p className="panel-subtitle">더블클릭 또는 아래 버튼으로 배치 모드로 전환</p>
          </div>
          <button
            type="button"
            onClick={() => startPlacementForFurniture(selectedFurniture.id)}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: "#4A90E2",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            배치 모드로 전환
          </button>
          <div className="inspector-grid">
            {numberField("X (mm)", Math.round(selectedFurniture.x), (next) => {
              updateFurniture(selectedFurniture.id, { x: next });
              commitHistory();
            })}
            {numberField("Y (mm)", Math.round(selectedFurniture.y), (next) => {
              updateFurniture(selectedFurniture.id, { y: next });
              commitHistory();
            })}
            {numberField("너비 (mm)", selectedFurniture.width, (next) => {
              updateFurniture(selectedFurniture.id, {
                width: Math.max(next, 100),
              });
              commitHistory();
            })}
            {numberField("깊이 (mm)", selectedFurniture.depth, (next) => {
              updateFurniture(selectedFurniture.id, {
                depth: Math.max(next, 100),
              });
              commitHistory();
            })}
            {numberField("높이 (mm)", selectedFurniture.height, (next) => {
              updateFurniture(selectedFurniture.id, {
                height: Math.max(next, 100),
              });
              commitHistory();
            })}
            {numberField(
              "회전 (도)",
              Math.round(selectedFurniture.rotation),
              (next) => {
                updateFurniture(selectedFurniture.id, { rotation: normalizeRotation(next) });
                commitHistory();
              }
            )}
            {colorField("색상", selectedFurniture.color ?? DEFAULT_FURNITURE_COLOR, (next) => {
              updateFurniture(selectedFurniture.id, { color: next });
              commitHistory();
            })}
            {isMonitorType(selectedFurniture.type) &&
              numberField(
                "인치",
                Math.round(
                  dimensionsToInches(
                    selectedFurniture.type,
                    selectedFurniture.name,
                    selectedFurniture.width,
                    selectedFurniture.depth,
                    selectedFurniture.height,
                  ) * 10,
                ) / 10,
                (next) => {
                  const dims = inchesToDimensions(
                    Math.max(next, 10),
                    selectedFurniture.type,
                    selectedFurniture.name,
                  );
                  updateFurniture(selectedFurniture.id, dims);
                  commitHistory();
                },
              )}
          </div>
          {isMonitorType(selectedFurniture.type) && (
            <button
              type="button"
              onClick={() => {
                updateFurniture(selectedFurniture.id, {
                  pivoted: !selectedFurniture.pivoted,
                });
                commitHistory();
              }}
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: selectedFurniture.pivoted ? "#4A90E2" : "#ddd",
                color: selectedFurniture.pivoted ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              피벗 전환 {selectedFurniture.pivoted ? "(세로)" : "(가로)"}
            </button>
          )}
          <div className="inspector-rotate-actions">
            <button type="button" onClick={() => rotateSelectedFurniture(-15)}>
              -15°
            </button>
            <button type="button" onClick={() => rotateSelectedFurniture(15)}>
              +15°
            </button>
            <button type="button" onClick={() => rotateSelectedFurniture(-90)}>
              -90°
            </button>
            <button type="button" onClick={() => rotateSelectedFurniture(90)}>
              +90°
            </button>
          </div>
          <button
            className="inspector-delete"
            onClick={() => removeFurniture(selectedFurniture.id)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            가구 삭제
          </button>
        </>
      )}

      {/* Selected Door */}
      {showDoor && selectedDoor && (
        <>
          <div>
            <p className="panel-kicker">선택됨</p>
            <h2 className="panel-title">{wallLabels[selectedDoor.wall]} 벽의 문</h2>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <span>문 타입:</span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  updateDoor(selectedDoor.id, { doorType: "swing" });
                  commitHistory();
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  background: selectedDoor.doorType === "swing" ? "#4A90E2" : "#ddd",
                  color: selectedDoor.doorType === "swing" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                여닫이문
              </button>
              <button
                onClick={() => {
                  updateDoor(selectedDoor.id, { doorType: "sliding" });
                  commitHistory();
                }}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  background: selectedDoor.doorType === "sliding" ? "#4A90E2" : "#ddd",
                  color: selectedDoor.doorType === "sliding" ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                미닫이문
              </button>
            </div>
          </div>
          <div className="inspector-grid">
            {numberField("위치 (mm)", Math.round(selectedDoor.offset), (next) => {
              updateDoor(selectedDoor.id, { offset: next });
              commitHistory();
            })}
            {numberField("너비 (mm)", selectedDoor.width, (next) => {
              updateDoor(selectedDoor.id, { width: Math.max(next, 500) });
              commitHistory();
            })}
            {numberField("높이 (mm)", selectedDoor.height, (next) => {
              updateDoor(selectedDoor.id, { height: Math.max(next, 1800) });
              commitHistory();
            })}
            {selectedDoor.doorType === "swing" && numberField("개폐 각도 (도)", selectedDoor.openAngle, (next) => {
              updateDoor(selectedDoor.id, {
                openAngle: Math.max(0, Math.min(120, next)),
              });
            })}
            {colorField("문 색상", selectedDoor.color ?? "#654321", (next) => {
              updateDoor(selectedDoor.id, { color: next });
              commitHistory();
            })}
          </div>
          {selectedDoor.doorType === "swing" && (
            <>
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  <span>경첩:</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      updateDoor(selectedDoor.id, { hinge: "left" });
                      commitHistory();
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: selectedDoor.hinge === "left" ? "#4A90E2" : "#ddd",
                      color: selectedDoor.hinge === "left" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    왼쪽
                  </button>
                  <button
                    onClick={() => {
                      updateDoor(selectedDoor.id, { hinge: "right" });
                      commitHistory();
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: selectedDoor.hinge === "right" ? "#4A90E2" : "#ddd",
                      color: selectedDoor.hinge === "right" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    오른쪽
                  </button>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem" }}>
                  <span>열림 방향:</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      updateDoor(selectedDoor.id, { swing: "inward" });
                      commitHistory();
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background:
                        selectedDoor.swing === "inward" ? "#4A90E2" : "#ddd",
                      color: selectedDoor.swing === "inward" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    안쪽
                  </button>
                  <button
                    onClick={() => {
                      updateDoor(selectedDoor.id, { swing: "outward" });
                      commitHistory();
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background:
                        selectedDoor.swing === "outward" ? "#4A90E2" : "#ddd",
                      color: selectedDoor.swing === "outward" ? "white" : "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    바깥쪽
                  </button>
                </div>
              </div>
            </>
          )}
          {selectedDoor.doorType === "sliding" && (
            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                <span>슬라이드 방향:</span>
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    updateDoor(selectedDoor.id, { slideDirection: "left" });
                    commitHistory();
                  }}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    background: selectedDoor.slideDirection === "left" ? "#4A90E2" : "#ddd",
                    color: selectedDoor.slideDirection === "left" ? "white" : "#333",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  왼쪽
                </button>
                <button
                  onClick={() => {
                    updateDoor(selectedDoor.id, { slideDirection: "right" });
                    commitHistory();
                  }}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    background: selectedDoor.slideDirection === "right" ? "#4A90E2" : "#ddd",
                    color: selectedDoor.slideDirection === "right" ? "white" : "#333",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  오른쪽
                </button>
              </div>
            </div>
          )}
          <button
            className="inspector-delete"
            onClick={() => removeDoor(selectedDoor.id)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            문 삭제
          </button>
        </>
      )}

      {/* Selected Window */}
      {showWindow && selectedWindow && (
        <>
          <div>
            <p className="panel-kicker">선택됨</p>
            <h2 className="panel-title">{wallLabels[selectedWindow.wall]} 벽의 창문</h2>
          </div>
          <div className="inspector-grid">
            {numberField("위치 (mm)", Math.round(selectedWindow.offset), (next) => {
              updateWindow(selectedWindow.id, { offset: next });
              commitHistory();
            })}
            {numberField("너비 (mm)", selectedWindow.width, (next) => {
              updateWindow(selectedWindow.id, { width: Math.max(next, 300) });
              commitHistory();
            })}
            {numberField("높이 (mm)", selectedWindow.height, (next) => {
              updateWindow(selectedWindow.id, { height: Math.max(next, 300) });
              commitHistory();
            })}
            {numberField("창턱 높이 (mm)", selectedWindow.sillHeight, (next) => {
              updateWindow(selectedWindow.id, { sillHeight: Math.max(next, 0) });
              commitHistory();
            })}
          </div>
          <button
            className="inspector-delete"
            onClick={() => removeWindow(selectedWindow.id)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            창문 삭제
          </button>
        </>
      )}

      {/* Empty State */}
      {showEmpty && (
        <div className="inspector-selected">
          <p className="panel-kicker">속성</p>
          <p className="panel-subtitle">선택된 항목이 없습니다</p>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#ffebee",
            border: "1px solid #ef5350",
            borderRadius: "4px",
            color: "#c62828",
            fontSize: "0.875rem",
          }}
        >
          {validationErrors.map((error, i) => (
            <div key={i}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
