import "./PalettePanel.css";
import { useState } from "react";
import { FURNITURE_CATALOG, FURNITURE_PRESETS } from "../constants";
import type { FurnitureType, WallSide } from "../types";
import { useSimulatorStore } from "../store/useSimulatorStore";

const furnitureTypes = Object.keys(FURNITURE_CATALOG) as FurnitureType[];
const wallSides: WallSide[] = ["north", "east", "south", "west"];

const wallLabels: Record<WallSide, string> = {
  north: "북",
  east: "동",
  south: "남",
  west: "서",
};

const presetGroups = furnitureTypes
  .map((type) => ({
    type,
    title: FURNITURE_CATALOG[type].label,
    presets: FURNITURE_PRESETS.filter((preset) => preset.type === type),
  }))
  .filter((group) => group.presets.length > 0);

export function PalettePanel() {
  const [selectedWall, setSelectedWall] = useState<WallSide>("north");
  const [expandedType, setExpandedType] = useState<FurnitureType | null>("bed");
  const setPendingFurniture = useSimulatorStore((state) => state.setPendingFurniture);
  const setPendingDoor = useSimulatorStore((state) => state.setPendingDoor);
  const setPendingWindow = useSimulatorStore((state) => state.setPendingWindow);

  const togglePresetGroup = (type: FurnitureType) => {
    setExpandedType((prev) => (prev === type ? null : type));
  };

  return (
    <div className="palette-panel">
      <div>
        <p className="panel-kicker">팔레트</p>
        <h2 className="panel-title">가구</h2>
        <p className="panel-subtitle">프리셋을 선택해 대기 값을 채우세요</p>
      </div>

      <div>
        <p className="panel-kicker">프리셋</p>
        <h2 className="panel-title">가구 평균 사이즈</h2>
        <p className="panel-subtitle">자동 배치 없이 이름/치수만 채워집니다</p>
      </div>

      <div className="palette-preset-groups">
        {presetGroups.map((group) => (
          <div
            key={group.type}
            className={`palette-preset-group ${expandedType === group.type ? "is-open" : ""}`}
          >
            <button
              className="palette-preset-toggle"
              onClick={() => togglePresetGroup(group.type)}
            >
              <span className="palette-preset-title">{group.title}</span>
              <span>{expandedType === group.type ? "▲" : "▼"}</span>
            </button>
            {expandedType === group.type && (
              <div className="palette-preset-dropdown">
                <div className="palette-preset-row">
                {group.presets.map((preset) => (
                  <button
                    key={preset.id}
                    className="palette-preset-chip"
                    onClick={() =>
                      setPendingFurniture(preset.type, {
                        name: preset.name,
                        width: preset.width,
                        depth: preset.depth,
                        height: preset.height,
                      })
                    }
                  >
                    {preset.label} · {preset.width}x{preset.depth}
                  </button>
                ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <p className="panel-kicker">개구부</p>
        <h2 className="panel-title">문 & 창문</h2>
        <p className="panel-subtitle">벽을 선택하고 추가하세요</p>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 500 }}>벽:</span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {wallSides.map((wall) => (
            <button
              key={wall}
              onClick={() => setSelectedWall(wall)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                background: selectedWall === wall ? "#4A90E2" : "white",
                color: selectedWall === wall ? "white" : "#333",
                cursor: "pointer",
              }}
            >
              {wallLabels[wall]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => setPendingDoor(selectedWall)}
          style={{
            flex: 1,
            padding: "0.75rem",
            background: "#654321",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          문 선택
        </button>
        <button
          onClick={() => setPendingWindow(selectedWall)}
          style={{
            flex: 1,
            padding: "0.75rem",
            background: "#4682B4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          창문 선택
        </button>
      </div>
    </div>
  );
}
