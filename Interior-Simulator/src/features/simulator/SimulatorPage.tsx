import "./SimulatorPage.css";
import { useEffect, useState, type ComponentType } from "react";
import { InspectorPanel } from "./components/InspectorPanel";
import { PalettePanel } from "./components/PalettePanel";
import { Toolbar } from "./components/Toolbar";
import { StructureCanvas } from "./editor2d/StructureCanvas";
import { ScenarioCanvas } from "./editor2d/ScenarioCanvas";
import { StructureToolPanel } from "./components/structure/StructureToolPanel";
import { StructureInspector } from "./components/structure/StructureInspector";
import { ProjectToolbar } from "./components/project/ProjectToolbar";
import { MemoryCanvas } from "./editor2d/MemoryCanvas";
import { MemoryPanel } from "./components/memory/MemoryPanel";
import { MemoryInspector } from "./components/memory/MemoryInspector";
import { ScenarioMaterialPanel } from "./components/scenario/ScenarioMaterialPanel";
import { useSimulatorStore } from "./store/useSimulatorStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAutoSave } from "./hooks/useAutoSave";
import { ErrorBoundary } from "../../shared/ui/ErrorBoundary";

function SceneLoading() {
  return <div className="sim-scene-loading">3D 공간을 준비하고 있습니다…</div>;
}

type StructureScene3DProps = {
  memoryMode?: boolean;
  showScenarioMaterials?: boolean;
};

function DeferredStructureScene3D(props: StructureScene3DProps) {
  const [Scene, setScene] =
    useState<ComponentType<StructureScene3DProps> | null>(null);

  useEffect(() => {
    let active = true;
    void import("./scene3d/StructureScene3D").then((module) => {
      if (active) setScene(() => module.StructureScene3D);
    });
    return () => {
      active = false;
    };
  }, []);

  return Scene ? <Scene {...props} /> : <SceneLoading />;
}

export function SimulatorPage() {
  const viewMode = useSimulatorStore((state) => state.viewMode);
  const setViewMode = useSimulatorStore((state) => state.setViewMode);
  const workspaceMode = useSimulatorStore((state) => state.workspaceMode);
  const setWorkspaceMode = useSimulatorStore(
    (state) => state.setWorkspaceMode
  );

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Enable auto-save
  useAutoSave();

  const canvas2d =
    workspaceMode === "scenario" ? (
      <ScenarioCanvas />
    ) : workspaceMode === "memory" ? (
      <MemoryCanvas />
    ) : (
      <StructureCanvas />
    );
  const scene3d = (
    <DeferredStructureScene3D
      memoryMode={workspaceMode === "memory"}
      showScenarioMaterials={workspaceMode !== "structure"}
    />
  );
  const workspaceTitle =
    workspaceMode === "structure"
      ? "평면도에서 집 구조 만들기"
      : workspaceMode === "scenario"
        ? "가구 배치와 인테리어 시뮬레이션"
        : "공간의 사진과 기억 기록하기";

  return (
    <div className="sim-root">
      <header className="sim-header">
        <div className="sim-brand">
          <p className="sim-kicker">Interior Simulator</p>
          <h1 className="sim-title">{workspaceTitle}</h1>
        </div>
        <div className="sim-workspace-tabs" aria-label="작업 공간">
          <button
            className={workspaceMode === "structure" ? "active" : ""}
            onClick={() => setWorkspaceMode("structure")}
          >
            1. 구조
          </button>
          <button
            className={workspaceMode === "scenario" ? "active" : ""}
            onClick={() => setWorkspaceMode("scenario")}
          >
            2. 시뮬레이션
          </button>
          <button
            className={workspaceMode === "memory" ? "active" : ""}
            onClick={() => setWorkspaceMode("memory")}
          >
            3. 공간 기록
          </button>
        </div>
        <div className="sim-header-actions">
          <button
            className={
              viewMode === "2d" ? "sim-pill" : "sim-pill sim-pill-secondary"
            }
            onClick={() => setViewMode("2d")}
          >
            2D
          </button>
          <button
            className={
              viewMode === "split" ? "sim-pill" : "sim-pill sim-pill-secondary"
            }
            onClick={() => setViewMode("split")}
          >
            Split
          </button>
          <button
            className={
              viewMode === "3d" ? "sim-pill" : "sim-pill sim-pill-secondary"
            }
            onClick={() => setViewMode("3d")}
          >
            3D
          </button>
        </div>
      </header>
      <ProjectToolbar />
      {workspaceMode === "scenario" && <Toolbar />}
      <div className="sim-body" data-view={viewMode}>
        <aside className="sim-panel sim-left">
          {workspaceMode === "scenario" ? (
            <PalettePanel />
          ) : workspaceMode === "memory" ? (
            <MemoryPanel />
          ) : (
            <StructureToolPanel />
          )}
        </aside>
        <main className="sim-canvas">
          {viewMode === "2d" && canvas2d}
          {viewMode === "3d" && (
            <ErrorBoundary>
              {scene3d}
            </ErrorBoundary>
          )}
          {viewMode === "split" && (
            <div className="sim-split">
              <div style={{ flex: 1, minWidth: 0 }}>
                {canvas2d}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ErrorBoundary>
                  {scene3d}
                </ErrorBoundary>
              </div>
            </div>
          )}
        </main>
        {viewMode !== "3d" && (
          <aside className="sim-panel sim-right">
            {workspaceMode === "scenario" ? (
              <>
                <InspectorPanel />
                <ScenarioMaterialPanel />
              </>
            ) : workspaceMode === "memory" ? (
              <MemoryInspector />
            ) : (
              <StructureInspector />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
