import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectToolbar } from "./ProjectToolbar";
import { useSimulatorStore } from "../../store/useSimulatorStore";

describe("ProjectToolbar", () => {
  it("hides scenario and advanced controls outside the arrange step", () => {
    useSimulatorStore.setState({ workspaceMode: "structure" });
    render(<ProjectToolbar />);
    expect(screen.queryByLabelText("활성 배치안")).toBeNull();
    expect(screen.queryByLabelText("활성 구조 리비전")).toBeNull();
    expect(screen.queryByRole("button", { name: "프로젝트 내보내기" })).toBeNull();
    expect(screen.getByRole("button", { name: "새 프로젝트" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "더보기" })).toBeInTheDocument();
  });

  it("shows scenario controls in the arrange step", () => {
    useSimulatorStore.setState({ workspaceMode: "scenario" });
    render(<ProjectToolbar />);
    expect(screen.getByLabelText("활성 배치안")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복제" })).toBeInTheDocument();
  });
});
