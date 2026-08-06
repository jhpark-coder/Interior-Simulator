import type { InteriorProject } from "../../domain/project";
import { useSimulatorStore } from "../useSimulatorStore";
import { saveProject } from "./projectDb";

export async function saveActiveProjectBeforeTransition(): Promise<InteriorProject> {
  const project = useSimulatorStore.getState().snapshotProject();
  await saveProject(project);
  return project;
}
