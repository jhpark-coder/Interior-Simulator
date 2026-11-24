import type { InteriorProject } from "../../domain/project";
import { useSimulatorStore } from "../useSimulatorStore";
import { saveProjectFromThisTab } from "./tabSync";

export async function saveActiveProjectBeforeTransition(): Promise<InteriorProject> {
  const project = useSimulatorStore.getState().snapshotProject();
  // 다른 탭이 이 프로젝트를 더 최신으로 저장했다면, 이 탭의 오래된 내용으로 덮어쓰지 않는다.
  await saveProjectFromThisTab(project);
  return project;
}
