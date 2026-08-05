import { useSimulatorStore } from "../../store/useSimulatorStore";
import "./ScenarioMaterialPanel.css";

function currentColor(
  materials: ReturnType<typeof useSimulatorStore.getState>["activeMaterials"],
  targetId: string,
  surface: "wall" | "floor",
  fallback: string
) {
  return (
    materials.find(
      (material) =>
        material.targetId === targetId && material.surface === surface
    )?.color ?? fallback
  );
}

export function ScenarioMaterialPanel() {
  const materials = useSimulatorStore((state) => state.activeMaterials);
  const setMaterial = useSimulatorStore(
    (state) => state.setScenarioMaterial
  );
  const wallColor = currentColor(
    materials,
    "all-walls",
    "wall",
    "#e6ddd2"
  );
  const floorColor = currentColor(
    materials,
    "all-floors",
    "floor",
    "#c9a783"
  );

  return (
    <section className="scenario-material-panel">
      <div>
        <p className="panel-kicker">Scenario finish</p>
        <h3>배치안 마감재</h3>
      </div>
      <label>
        <span>전체 벽 색상</span>
        <input
          type="color"
          value={wallColor}
          onChange={(event) =>
            setMaterial("all-walls", "wall", event.target.value)
          }
        />
      </label>
      <label>
        <span>전체 바닥 색상</span>
        <input
          type="color"
          value={floorColor}
          onChange={(event) =>
            setMaterial("all-floors", "floor", event.target.value)
          }
        />
      </label>
      <p>마감재는 현재 배치안에만 저장되어 A/B 비교 시 독립적으로 유지됩니다.</p>
    </section>
  );
}
