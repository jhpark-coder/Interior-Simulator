import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SnapToggle } from "./SnapToggle";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { DEFAULT_ROOM } from "../../constants";

describe("SnapToggle", () => {
  it("toggles grid snap", () => {
    useSimulatorStore.setState({ room: { ...DEFAULT_ROOM, snapEnabled: true } });
    render(<SnapToggle />);
    const checkbox = screen.getByRole("checkbox", { name: "격자 스냅" });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(useSimulatorStore.getState().room.snapEnabled).toBe(false);
  });
});
