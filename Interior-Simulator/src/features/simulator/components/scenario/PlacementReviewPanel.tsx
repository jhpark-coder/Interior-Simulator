import { useFurnitureReview } from "../../hooks/useFurnitureReview";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import "./PlacementReviewPanel.css";

const REASON_LABELS = {
  "outside-structure": "집 구조 바깥",
  "crosses-wall": "벽을 가로지름",
} as const;

/**
 * 확인이 필요한 가구 목록. 구조가 바뀐 뒤 벽 밖·벽 관통이 된 가구와, 문이 열리는
 * 범위를 막는 가구를 모은다. 누르면 해당 가구를 선택한다.
 */
export function PlacementReviewPanel() {
  const furniture = useSimulatorStore((state) => state.furniture);
  const selectedEntity = useSimulatorStore((state) => state.selectedEntity);
  const selectEntity = useSimulatorStore((state) => state.selectEntity);
  const { misplaced, blockedDoors, flaggedIds } = useFurnitureReview();

  if (flaggedIds.size === 0) return null;

  const entries = [
    ...misplaced.map(({ id, reason }) => ({
      key: `${id}:${reason}`,
      id,
      label: REASON_LABELS[reason],
    })),
    ...blockedDoors.flatMap((door) =>
      door.blockingFurnitureIds.map((id) => ({
        key: `${id}:${door.openingId}`,
        id,
        label:
          door.clearAngle === null
            ? "미닫이문을 막음"
            : `문이 ${Math.floor(door.clearAngle)}°까지만 열림`,
      }))
    ),
  ];

  return (
    <section className="placement-review" aria-label="배치 검토">
      <p className="panel-kicker">배치 검토</p>
      <h2 className="panel-title">확인할 가구 {flaggedIds.size}개</h2>
      <p className="panel-subtitle">
        벽 밖에 있거나 벽을 가로지르는 가구, 문이 열리는 범위를 막는 가구입니다. 눌러서
        선택한 뒤 옮기세요.
      </p>
      <ul>
        {entries.map(({ key, id, label }) => {
          const item = furniture.find((candidate) => candidate.id === id);
          const selected = selectedEntity?.kind === "furniture" && selectedEntity.id === id;
          return (
            <li key={key}>
              <button
                type="button"
                className={selected ? "active" : undefined}
                onClick={() => selectEntity({ kind: "furniture", id })}
              >
                <strong>{item?.name ?? "가구"}</strong>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
