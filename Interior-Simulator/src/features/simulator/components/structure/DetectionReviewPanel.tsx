import { useSimulatorStore } from "../../store/useSimulatorStore";

function kindName(kind: "wall" | "opening" | "label") {
  if (kind === "wall") return "벽";
  if (kind === "opening") return "문·창문";
  return "텍스트";
}

export function DetectionReviewPanel() {
  const status = useSimulatorStore((state) => state.detectionStatus);
  const candidates = useSimulatorStore((state) => state.detectionCandidates);
  const runs = useSimulatorStore((state) => state.detectionRuns);
  const error = useSimulatorStore((state) => state.detectionError);
  const selectedId = useSimulatorStore(
    (state) => state.selectedDetectionCandidateId
  );
  const select = useSimulatorStore(
    (state) => state.selectDetectionCandidate
  );
  const accept = useSimulatorStore(
    (state) => state.acceptDetectionCandidate
  );
  const reject = useSimulatorStore(
    (state) => state.rejectDetectionCandidate
  );
  const acceptAll = useSimulatorStore(
    (state) => state.acceptAllDetectionCandidates
  );
  const clear = useSimulatorStore(
    (state) => state.clearDetectionCandidates
  );
  const sourceId = useSimulatorStore(
    (state) => state.activeFloorPlanSourceId
  );
  const source = useSimulatorStore((state) =>
    state.floorPlanSources.find((item) => item.id === sourceId)
  );
  const updateSource = useSimulatorStore(
    (state) => state.updateFloorPlanSource
  );
  const structure = useSimulatorStore((state) => state.structure);
  const lastRun = runs[runs.length - 1];
  const pendingCount = candidates.filter(
    (candidate) => candidate.status === "pending"
  ).length;
  const acceptedCount = candidates.filter(
    (candidate) => candidate.status === "accepted"
  ).length;
  const rejectedCount = candidates.filter(
    (candidate) => candidate.status === "rejected"
  ).length;
  const manualWallCount = structure.walls.filter(
    (wall) => wall.source.origin !== "detected"
  ).length;
  const confirmedDetectedCount = structure.walls.filter(
    (wall) =>
      wall.source.origin === "detected" && wall.source.confirmedByUser
  ).length;

  if (status === "idle") return null;

  return (
    <section className="structure-section detection-review">
      <div className="structure-section-heading">
        <strong>자동 인식 검토</strong>
        {status === "review" && (
          <button className="structure-link-button" onClick={clear}>
            후보 닫기
          </button>
        )}
      </div>
      {status === "analyzing" && (
        <div className="detection-progress">
          <span />
          평면도를 분석하고 있습니다…
        </div>
      )}
      {status === "error" && <div className="detection-error">{error}</div>}
      {status === "review" && (
        <>
          {!lastRun?.calibrated && (
            <div className="detection-warning">
              축척 미확정: 후보 위치는 10 mm/px 임시값입니다. 축척을 먼저
              맞춘 뒤 승인하는 것을 권장합니다.
            </div>
          )}
          <div className="detection-summary">
            <span>검토 대기 {pendingCount}</span>
            <span>승인 {acceptedCount}</span>
            <span>거절 {rejectedCount}</span>
          </div>
          <div className="detection-compare" aria-label="3-way 구조 비교">
            <div>
              <strong>{pendingCount}</strong>
              <span>자동 후보</span>
            </div>
            <div>
              <strong>{confirmedDetectedCount}</strong>
              <span>승인한 자동값</span>
            </div>
            <div>
              <strong>{manualWallCount}</strong>
              <span>직접 만든 벽</span>
            </div>
          </div>
          {pendingCount > 0 && (
            <button
              className="detection-accept-all"
              onClick={() => acceptAll()}
            >
              모든 후보 순서대로 승인
            </button>
          )}
          <div className="detection-list">
            {candidates.map((candidate, index) => (
              <article
                key={candidate.id}
                className={
                  candidate.id === selectedId
                    ? "detection-item selected"
                    : "detection-item"
                }
                data-status={candidate.status}
                onClick={() => select(candidate.id)}
              >
                <button
                  className="detection-item-title"
                  onClick={() => select(candidate.id)}
                >
                  <span>
                    {index + 1}. {kindName(candidate.kind)}
                    {candidate.kind === "label" && ` · ${candidate.text}`}
                  </span>
                  <strong>{Math.round(candidate.confidence * 100)}%</strong>
                </button>
                {candidate.status === "pending" ? (
                  <div className="detection-item-actions">
                    <button onClick={() => accept(candidate.id)}>승인</button>
                    <button onClick={() => reject(candidate.id)}>거절</button>
                  </div>
                ) : (
                  <span className="detection-status">
                    {candidate.status === "accepted"
                      ? "사용자 승인됨"
                      : "거절됨"}
                  </span>
                )}
              </article>
            ))}
          </div>
          {lastRun && (
            <div className="detection-metrics">
              분석 {Math.round(lastRun.elapsedMs)}ms · 임계값{" "}
              {lastRun.threshold} · 기울기{" "}
              {lastRun.estimatedSkewDegrees.toFixed(1)}°
              {source &&
                Math.abs(lastRun.estimatedSkewDegrees) >= 0.5 && (
                  <button
                    onClick={() =>
                      updateSource(source.id, {
                        transform: {
                          ...source.transform,
                          rotation:
                            source.transform.rotation -
                            lastRun.estimatedSkewDegrees,
                        },
                      })
                    }
                  >
                    기울기 보정 적용
                  </button>
                )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
