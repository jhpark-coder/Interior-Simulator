import "./Toolbar.css";
import { useRef } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { validateLayoutDoc } from "../utils/zodSchemas";
import type { LayoutDoc } from "../types";

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const room = useSimulatorStore((state) => state.room);
  const roomDimensionPlacement = useSimulatorStore((state) => state.roomDimensionPlacement);
  const exportLayout = useSimulatorStore((state) => state.exportLayout);
  const importLayout = useSimulatorStore((state) => state.importLayout);
  const setRoom = useSimulatorStore((state) => state.setRoom);
  const flipRoomDimensionHorizontal = useSimulatorStore(
    (state) => state.flipRoomDimensionHorizontal
  );
  const flipRoomDimensionVertical = useSimulatorStore(
    (state) => state.flipRoomDimensionVertical
  );

  const handleExport = () => {
    const layout = exportLayout();
    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate with Zod
      const validation = validateLayoutDoc(data);
      if (!validation.success) {
        alert(
          `유효하지 않은 레이아웃 파일:\n${validation.errors?.join("\n") || "알 수 없는 오류"}`
        );
        return;
      }

      // Import the validated data
      importLayout(data as LayoutDoc);
      alert("레이아웃을 불러왔습니다!");
    } catch (error) {
      alert(`레이아웃 불러오기 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleToggleGrid = () => {
    setRoom({ snapEnabled: !room.snapEnabled });
  };

  const horizontalLabel = roomDimensionPlacement.horizontalSide === "top" ? "위" : "아래";
  const verticalLabel = roomDimensionPlacement.verticalSide === "right" ? "오른쪽" : "왼쪽";

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button className="toolbar-btn" onClick={handleExport} title="레이아웃 내보내기 (Ctrl+S)">
        <span>💾</span>
        <span>내보내기</span>
      </button>

      <button className="toolbar-btn" onClick={handleImport} title="레이아웃 가져오기">
        <span>📂</span>
        <span>가져오기</span>
      </button>

      <div className="toolbar-divider" />

      <button
        className={`toolbar-btn ${room.snapEnabled ? "active" : ""}`}
        onClick={handleToggleGrid}
        title="격자 스냅 토글"
      >
        <span>🔲</span>
        <span>스냅: {room.snapEnabled ? "켜짐" : "꺼짐"}</span>
      </button>

      <div className="toolbar-divider" />

      <button
        className="toolbar-btn"
        onClick={flipRoomDimensionHorizontal}
        title="방 가로 치수선 위치 반전 (위/아래)"
      >
        <span>↕️</span>
        <span>치수(가로): {horizontalLabel}</span>
      </button>

      <button
        className="toolbar-btn"
        onClick={flipRoomDimensionVertical}
        title="방 세로 치수선 위치 반전 (왼쪽/오른쪽)"
      >
        <span>↔️</span>
        <span>치수(세로): {verticalLabel}</span>
      </button>
    </div>
  );
}
