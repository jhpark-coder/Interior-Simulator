import "./SimulatorPage.css";
import { Canvas2D } from "./components/Canvas2D";
import { InspectorPanel } from "./components/InspectorPanel";
import { PalettePanel } from "./components/PalettePanel";
import { Toolbar } from "./components/Toolbar";
import { Scene3D } from "./scene3d/Scene3D";
import { Scene3DTest } from "./scene3d/Scene3DTest";
import { useSimulatorStore } from "./store/useSimulatorStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAutoSave } from "./hooks/useAutoSave";

export function SimulatorPage() {
  const viewMode = useSimulatorStore((state) => state.viewMode);
  const setViewMode = useSimulatorStore((state) => state.setViewMode);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Enable auto-save
  useAutoSave();

  return (
    <div className="sim-root">
      <header className="sim-header">
        <div>
          <p className="sim-kicker">Interior Simulator</p>
          <h1 className="sim-title">Drag, place, and test your room layout</h1>
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
      <Toolbar />
      <div className="sim-body">
        <aside className="sim-panel sim-left">
          <PalettePanel />
        </aside>
        <main className="sim-canvas">
          {viewMode === "2d" && <Canvas2D />}
          {viewMode === "3d" && <Scene3DTest />}
          {viewMode === "split" && (
            <div style={{ display: "flex", width: "100%", height: "100%", gap: "1rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Canvas2D />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Scene3DTest />
              </div>
            </div>
          )}
        </main>
        <aside className="sim-panel sim-right">
          <InspectorPanel />
        </aside>
      </div>
    </div>
  );
}
