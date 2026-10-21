import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceStepper } from "./WorkspaceStepper";
import { useSimulatorStore } from "../../store/useSimulatorStore";

describe("WorkspaceStepper", () => {
  it("marks the current step and navigates to tour", () => {
    useSimulatorStore.setState({ workspaceMode: "structure", viewMode: "2d" });
    render(<WorkspaceStepper />);
    expect(screen.getByRole("button", { name: /집 구조/ })).toHaveAttribute(
      "aria-current",
      "step"
    );
    fireEvent.click(screen.getByRole("button", { name: /구경하기/ }));
    expect(useSimulatorStore.getState().workspaceMode).toBe("scenario");
    expect(useSimulatorStore.getState().viewMode).toBe("3d");
    expect(screen.getByRole("button", { name: /구경하기/ })).toHaveAttribute(
      "aria-current",
      "step"
    );
  });

  it("has no current step in memory workspace", () => {
    useSimulatorStore.setState({ workspaceMode: "memory", viewMode: "2d" });
    render(<WorkspaceStepper />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("aria-current");
    }
  });
});
