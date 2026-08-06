import "./Toolbar.css";
import { useRef } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { validateLayoutDoc } from "../utils/zodSchemas";
import type { LayoutDoc } from "../types";
import { inferCategoryFromType } from "../utils";
import { migrateLegacyLayoutToProject } from "../store/migrations/layoutV1ToProjectV2";
import { saveActiveProjectBeforeTransition } from "../store/persistence/projectTransition";
import { saveProject } from "../store/persistence/projectDb";

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const room = useSimulatorStore((state) => state.room);
  const exportLayout = useSimulatorStore((state) => state.exportLayout);
  const importProject = useSimulatorStore((state) => state.importProject);
  const setRoom = useSimulatorStore((state) => state.setRoom);

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
      if (!validation.success || !validation.data) {
        alert(
          `유효하지 않은 레이아웃 파일:\n${validation.errors?.join("\n") || "알 수 없는 오류"}`
        );
        return;
      }

      const normalizedLayout = {
        ...validation.data,
        furniture: validation.data.furniture.map((item) => ({
          ...item,
          category: item.category ?? inferCategoryFromType(item.type),
        })),
      } as LayoutDoc;
      const projectName = file.name.replace(/\.json$/i, "").trim() || "가져온 레이아웃";
      const project = migrateLegacyLayoutToProject(
        normalizedLayout,
        projectName,
        `project-migrated-${crypto.randomUUID()}`
      );
      await saveActiveProjectBeforeTransition();
      importProject(project);
      await saveProject(project);
      localStorage.setItem("interior-simulator-last-project", project.id);
      alert("구형 레이아웃을 현재 프로젝트 형식으로 변환했습니다.");
    } catch (error) {
      alert(
        `레이아웃 불러오기 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleToggleGrid = () => {
    setRoom({ snapEnabled: !room.snapEnabled });
  };

  return (
    <div className="toolbar">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <button
        className="toolbar-btn"
        onClick={handleExport}
        title="현재 배치의 구형 호환 JSON 내보내기"
      >
        <span>💾</span>
        <span>호환 JSON 내보내기</span>
      </button>

      <button
        className="toolbar-btn"
        onClick={handleImport}
        title="구형 LayoutDoc JSON을 현재 프로젝트로 변환"
      >
        <span>📂</span>
        <span>구형 JSON 가져오기</span>
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
    </div>
  );
}
