import { useMemo } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { findMisplacedFurniture } from "../../utils";
import "./PlacementReviewPanel.css";

const REASON_LABELS = {
  "outside-structure": "집 구조 바깥",
  "crosses-wall": "벽을 가로지름",
} as const;

/** 구조가 바뀐 뒤 벽 밖·벽 관통이 된 가구 목록. 누르면 해당 가구를 선택한다. */
export function PlacementReviewPanel() {
  const furniture = useSimulatorStore((state) => state.furniture);
  const structure = useSimulatorStore((state) => state.structure);
  const selectedEntity = useSimulatorStore((state) => state.selectedEntity);
  const selectEntity = useSimulatorStore((state) => state.selectEntity);
  const misplaced = useMemo(
    () => findMisplacedFurniture(furniture, structure),
    [furniture, structure]
  );

  if (misplaced.length === 0) return null;

  return (
    <section className="placement-review" aria-label="배치 검토">
      <p className="panel-kicker">배치 검토</p>
      <h2 className="panel-title">확인할 가구 {misplaced.length}개</h2>
      <p className="panel-subtitle">
        벽 밖에 있거나 벽을 가로지르는 가구입니다. 구조를 바꾼 뒤 생길 수 있습니다. 눌러서
        선택한 뒤 옮기세요.
      </p>
      <ul>
        {misplaced.map(({ id, reason }) => {
          const item = furniture.find((candidate) => candidate.id === id);
          const selected = selectedEntity?.kind === "furniture" && selectedEntity.id === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={selected ? "active" : undefined}
                onClick={() => selectEntity({ kind: "furniture", id })}
              >
                <strong>{item?.name ?? "가구"}</strong>
                <span>{REASON_LABELS[reason]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
