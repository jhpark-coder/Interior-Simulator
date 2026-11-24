import { useSyncExternalStore } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { isProjectStale, subscribeStaleProjects } from "../../store/persistence/tabSync";

/**
 * 다른 탭이 같은 프로젝트를 더 최신으로 저장했을 때 보여 준다.
 * 이 탭은 그 뒤로 자동 저장을 멈추므로, 새로고침해서 최신 내용을 불러오라고 안내한다.
 */
export function StaleTabBanner() {
  const projectId = useSimulatorStore((state) => state.projectId);
  const stale = useSyncExternalStore(
    subscribeStaleProjects,
    () => isProjectStale(projectId),
    () => false
  );
  if (!stale) return null;
  return (
    <div className="sim-stale-banner" role="alert">
      <span>
        다른 탭에서 이 프로젝트를 수정했습니다. 내용이 엇갈리지 않도록 이 탭의 변경은 더 이상
        저장되지 않습니다.
      </span>
      <button type="button" onClick={() => window.location.reload()}>
        새로고침해서 최신 내용 불러오기
      </button>
    </div>
  );
}
