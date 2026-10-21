import { describe, expect, it } from "vitest";
import {
  FLOW_STEPS,
  getActiveFlowStep,
  getFlowStepTarget,
  getWorkspaceTitle,
} from "./workspaceFlow";
import { useSimulatorStore } from "../../store/useSimulatorStore";

describe("workspaceFlow", () => {
  it("defines three steps in order", () => {
    expect(FLOW_STEPS.map((step) => step.id)).toEqual([
      "structure",
      "arrange",
      "tour",
    ]);
    expect(FLOW_STEPS.map((step) => step.label)).toEqual([
      "집 구조",
      "가구 배치",
      "구경하기",
    ]);
  });

  it("maps workspace and view to the active step", () => {
    expect(getActiveFlowStep("structure", "3d")).toBe("structure");
    expect(getActiveFlowStep("scenario", "2d")).toBe("arrange");
    expect(getActiveFlowStep("scenario", "split")).toBe("arrange");
    expect(getActiveFlowStep("scenario", "3d")).toBe("tour");
    expect(getActiveFlowStep("memory", "2d")).toBeNull();
  });

  it("tour always targets scenario in 3d", () => {
    expect(getFlowStepTarget("tour", "split")).toEqual({
      workspaceMode: "scenario",
      viewMode: "3d",
    });
  });

  it("leaving 3d returns to 2d, other views are kept", () => {
    expect(getFlowStepTarget("arrange", "3d")).toEqual({
      workspaceMode: "scenario",
      viewMode: "2d",
    });
    expect(getFlowStepTarget("arrange", "split")).toEqual({
      workspaceMode: "scenario",
      viewMode: "split",
    });
    expect(getFlowStepTarget("structure", "3d")).toEqual({
      workspaceMode: "structure",
      viewMode: "2d",
    });
  });

  it("titles follow the step, memory has its own title", () => {
    expect(getWorkspaceTitle("scenario", "3d")).toBe("3D로 둘러보기");
    expect(getWorkspaceTitle("structure", "2d")).toBe("평면도로 집 구조 만들기");
    expect(getWorkspaceTitle("memory", "2d")).toBe("공간 기록 (보조 기능)");
  });

  it("switching from memory to structure resets the pin tool", () => {
    useSimulatorStore.getState().setWorkspaceMode("memory");
    expect(useSimulatorStore.getState().structureTool).toBe("memory-pin");
    const target = getFlowStepTarget("structure", "2d");
    useSimulatorStore.getState().setWorkspaceMode(target.workspaceMode);
    expect(useSimulatorStore.getState().structureTool).toBe("select");
  });
});
