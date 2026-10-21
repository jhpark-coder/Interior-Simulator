import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MoreMenu } from "./MoreMenu";
import { useSimulatorStore } from "../../store/useSimulatorStore";

function renderMenu(overrides: Partial<Parameters<typeof MoreMenu>[0]> = {}) {
  const props = {
    onExportPackage: vi.fn(),
    onImportPackage: vi.fn(),
    onStatus: vi.fn(),
    ...overrides,
  };
  render(<MoreMenu {...props} />);
  return props;
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "더보기" }));
}

describe("MoreMenu", () => {
  beforeEach(() => {
    useSimulatorStore.setState({ workspaceMode: "scenario", memoryPins: [] });
  });

  it("opens, lists sections, and closes on Escape", () => {
    renderMenu();
    expect(screen.queryByRole("region", { name: "더보기" })).toBeNull();
    openMenu();
    expect(screen.getByRole("button", { name: "더보기" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("region", { name: "더보기" })).toBeInTheDocument();
    for (const title of ["백업", "구조 리비전", "호환 JSON", "보조 기능"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: "구조 리비전" })).toBeInTheDocument();
    expect(screen.getByLabelText("활성 구조 리비전")).toBeInTheDocument();
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "더보기" })).toBeNull();
  });

  it("returns focus to the trigger when closed with Escape", () => {
    renderMenu();
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "더보기" })).toHaveFocus();
  });

  it("does not leak Escape to window listeners such as canvas drafting", () => {
    const windowListener = vi.fn();
    window.addEventListener("keydown", windowListener);
    renderMenu();
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    window.removeEventListener("keydown", windowListener);
    expect(windowListener).not.toHaveBeenCalled();
  });

  it("closes on outside pointerdown", () => {
    renderMenu();
    openMenu();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("region", { name: "더보기" })).toBeNull();
  });

  it("calls onExportPackage and closes", () => {
    const props = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "백업 파일로 내보내기" }));
    expect(props.onExportPackage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "더보기" })).toBeNull();
  });

  it("lets the same backup file be picked twice", () => {
    const props = renderMenu();
    openMenu();
    const input = screen.getByTestId("more-menu-package-input") as HTMLInputElement;
    const file = new File(["x"], "home.interior-project");
    fireEvent.change(input, { target: { files: [file] } });
    expect(input.value).toBe("");
    openMenu();
    fireEvent.change(screen.getByTestId("more-menu-package-input"), {
      target: { files: [file] },
    });
    expect(props.onImportPackage).toHaveBeenCalledTimes(2);
    expect(props.onImportPackage).toHaveBeenCalledWith(file);
  });

  it("opens memory workspace and keeps existing pins", () => {
    useSimulatorStore.getState().addMemoryPin({ x: 1000, y: 1000 });
    renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "공간 기록 열기" }));
    expect(useSimulatorStore.getState().workspaceMode).toBe("memory");
    expect(useSimulatorStore.getState().snapshotProject().memoryPins).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "더보기" })).toBeNull();
  });
});
