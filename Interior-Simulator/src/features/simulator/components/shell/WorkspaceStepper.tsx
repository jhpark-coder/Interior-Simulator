import { Fragment } from "react";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { FLOW_STEPS, getActiveFlowStep, getFlowStepTarget } from "./workspaceFlow";
import "./WorkspaceStepper.css";

export function WorkspaceStepper() {
  const workspaceMode = useSimulatorStore((state) => state.workspaceMode);
  const viewMode = useSimulatorStore((state) => state.viewMode);
  const setWorkspaceMode = useSimulatorStore((state) => state.setWorkspaceMode);
  const setViewMode = useSimulatorStore((state) => state.setViewMode);
  const active = getActiveFlowStep(workspaceMode, viewMode);

  return (
    <nav className="workspace-stepper" aria-label="작업 단계">
      {FLOW_STEPS.map((step, index) => (
        <Fragment key={step.id}>
          {index > 0 && (
            <span className="workspace-stepper-arrow" aria-hidden="true">
              →
            </span>
          )}
          <button
            className={active === step.id ? "workspace-step active" : "workspace-step"}
            aria-current={active === step.id ? "step" : undefined}
            onClick={() => {
              const target = getFlowStepTarget(step.id, viewMode);
              setWorkspaceMode(target.workspaceMode);
              setViewMode(target.viewMode);
            }}
          >
            <span className="workspace-step-number">{step.number}</span>
            {step.label}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
