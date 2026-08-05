import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InspectorPanel } from "./InspectorPanel";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { DEFAULT_ROOM } from "../constants";

function resetStore() {
  useSimulatorStore.setState({
    room: { ...DEFAULT_ROOM },
    furniture: [],
    doors: [],
    windows: [],
    selectedEntity: null,
    viewMode: "2d",
    roomDimensionPlacement: { horizontalSide: "top", verticalSide: "right" },
    historyPast: [],
    historyFuture: [],
    validationErrors: [],
    pendingFurniture: null,
    pendingDoor: null,
    pendingWindow: null,
    placingFurnitureId: null,
    placingFurniture: null,
  });
}

function gs() {
  return useSimulatorStore.getState();
}

describe("InspectorPanel", () => {
  beforeEach(resetStore);

  it("renders empty state when nothing is selected", () => {
    render(<InspectorPanel />);
    expect(screen.getByText("선택된 항목이 없습니다")).toBeInTheDocument();
  });

  it("renders furniture fields when a furniture item is selected", () => {
    gs().addFurniture("desk");
    const id = gs().furniture[0].id;
    gs().selectEntity({ kind: "furniture", id });

    render(<InspectorPanel />);
    // kicker and title
    expect(screen.getByText("선택됨")).toBeInTheDocument();
    expect(screen.getByText("책상")).toBeInTheDocument();
    // field labels
    expect(screen.getByText("너비 (mm)")).toBeInTheDocument();
    expect(screen.getByText("깊이 (mm)")).toBeInTheDocument();
    expect(screen.getByText("높이 (mm)")).toBeInTheDocument();
    expect(screen.getByText("회전 (도)")).toBeInTheDocument();
  });

  it("renders door fields when a door is selected", () => {
    gs().addDoor("north");
    const id = gs().doors[0].id;
    gs().selectEntity({ kind: "door", id });

    render(<InspectorPanel />);
    expect(screen.getByText("선택됨")).toBeInTheDocument();
    expect(screen.getByText("북쪽 벽의 문")).toBeInTheDocument();
    expect(screen.getByText("너비 (mm)")).toBeInTheDocument();
    expect(screen.getByText("높이 (mm)")).toBeInTheDocument();
  });

  it("renders window fields when a window is selected", () => {
    gs().addWindow("east");
    const id = gs().windows[0].id;
    gs().selectEntity({ kind: "window", id });

    render(<InspectorPanel />);
    expect(screen.getByText("선택됨")).toBeInTheDocument();
    expect(screen.getByText("동쪽 벽의 창문")).toBeInTheDocument();
    expect(screen.getByText("너비 (mm)")).toBeInTheDocument();
  });

  it("renders pending furniture UI with 추가 대기 중 kicker", () => {
    gs().setPendingFurniture("sofa");

    render(<InspectorPanel />);
    expect(screen.getByText("추가 대기 중")).toBeInTheDocument();
    expect(screen.getByText("소파")).toBeInTheDocument();
  });

  it("shows validation error message when validationErrors is non-empty", () => {
    gs().addFurniture("desk");
    const first = gs().furniture[0];
    gs().setPendingFurniture("desk");
    gs().updatePendingFurniture({ x: first.x, y: first.y });
    gs().commitPendingFurniture(); // triggers collision error

    render(<InspectorPanel />);
    expect(screen.getByText(/겹칩니다/)).toBeInTheDocument();
  });
});
