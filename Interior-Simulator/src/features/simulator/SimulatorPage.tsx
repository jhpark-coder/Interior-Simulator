import "./SimulatorPage.css";
import { useEffect, useState, type ComponentType } from "react";
import { InspectorPanel } from "./components/InspectorPanel";
import { PalettePanel } from "./components/PalettePanel";
import { StructureCanvas } from "./editor2d/StructureCanvas";
import { ScenarioCanvas } from "./editor2d/ScenarioCanvas";
import { StructureToolPanel } from "./components/structure/StructureToolPanel";
import { StructureInspector } from "./components/structure/StructureInspector";
import { ProjectToolbar } from "./components/project/ProjectToolbar";
import { MemoryCanvas } from "./editor2d/MemoryCanvas";
import { MemoryPanel } from "./components/memory/MemoryPanel";
import { MemoryInspector } from "./components/memory/MemoryInspector";
import { ScenarioMaterialPanel } from "./components/scenario/ScenarioMaterialPanel";
import { PlacementReviewPanel } from "./components/scenario/PlacementReviewPanel";
import { useSimulatorStore } from "./store/useSimulatorStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAutoSave } from "./hooks/useAutoSave";
import { ErrorBoundary } from "../../shared/ui/ErrorBoundary";
import { WorkspaceStepper } from "./components/shell/WorkspaceStepper";
import { getWorkspaceTitle } from "./components/shell/workspaceFlow";

function SceneLoading() {
  return <div className="sim-scene-loading">3D 공간을 준비하고 있습니다…</div>;
}

type StructureScene3DProps = {
  memoryMode?: boolean;
  showScenarioMaterials?: boolean;
};

function SceneLoadFailed() {
  return (
    <div className="sim-scene-loading sim-scene-load-failed" role="alert">
      <p>3D 화면을 불러오지 못했습니다.</p>
      <p className="sim-scene-load-failed-hint">
        앱이 새 버전으로 업데이트됐거나 네트워크가 끊겼을 수 있습니다. 작업 내용은 자동
        저장됩니다.
      </p>
      <button type="button" onClick={() => window.location.reload()}>
        새로고침
      </button>
    </div>
  );
}

function DeferredStructureScene3D(props: StructureScene3DProps) {
  const [Scene, setScene] =
    useState<ComponentType<StructureScene3DProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    // 새 버전이 배포되면 예전 파일 이름의 3D 청크가 사라져, 열려 있던 탭에서는 불러오기가
    // 실패한다. 실패를 처리하지 않으면 "준비하고 있습니다"에서 영원히 멈춘다.
    import("./scene3d/StructureScene3D")
      .then((module) => {
        if (active) setScene(() => module.StructureScene3D);
      })
      .catch((error: unknown) => {
        console.error("3D 화면 불러오기 실패", error);
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (Scene) return <Scene {...props} />;
  return loadFailed ? <SceneLoadFailed /> : <SceneLoading />;
}

export function SimulatorPage() {
  const viewMode = useSimulatorStore((state) => state.viewMode);
  const setViewMode = useSimulatorStore((state) => state.setViewMode);
  const workspaceMode = useSimulatorStore((state) => state.workspaceMode);

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
  const workspaceTitle = getWorkspaceTitle(workspaceMode, viewMode);

  return (
    <div className="sim-root">
      <header className="sim-header">
        <div className="sim-brand">
          <p className="sim-kicker">Interior Simulator</p>
          <h1 className="sim-title">{workspaceTitle}</h1>
        </div>
        <WorkspaceStepper />
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
                <PlacementReviewPanel />
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
