import type { WorkspaceMode } from "../../store/slices/workspaceSlice";
import type { ViewMode } from "../../types";

export type FlowStepId = "structure" | "arrange" | "tour";

export type FlowStep = {
  id: FlowStepId;
  number: 1 | 2 | 3;
  label: string;
  title: string;
};

export const FLOW_STEPS: readonly FlowStep[] = [
  { id: "structure", number: 1, label: "집 구조", title: "평면도로 집 구조 만들기" },
  { id: "arrange", number: 2, label: "가구 배치", title: "가구 배치하기" },
  { id: "tour", number: 3, label: "구경하기", title: "3D로 둘러보기" },
];

export const MEMORY_WORKSPACE_TITLE = "공간 기록 (보조 기능)";

export function getActiveFlowStep(
  workspaceMode: WorkspaceMode,
  viewMode: ViewMode
): FlowStepId | null {
  if (workspaceMode === "structure") return "structure";
  if (workspaceMode === "scenario") return viewMode === "3d" ? "tour" : "arrange";
  return null;
}

export function getFlowStepTarget(
  step: FlowStepId,
  currentView: ViewMode
): { workspaceMode: WorkspaceMode; viewMode: ViewMode } {
  if (step === "tour") return { workspaceMode: "scenario", viewMode: "3d" };
  return {
    workspaceMode: step === "structure" ? "structure" : "scenario",
    viewMode: currentView === "3d" ? "2d" : currentView,
  };
}

export function getWorkspaceTitle(
  workspaceMode: WorkspaceMode,
  viewMode: ViewMode
): string {
  const active = getActiveFlowStep(workspaceMode, viewMode);
  return FLOW_STEPS.find((step) => step.id === active)?.title ?? MEMORY_WORKSPACE_TITLE;
}
