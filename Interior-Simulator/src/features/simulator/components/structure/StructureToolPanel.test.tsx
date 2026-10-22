import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useSimulatorStore } from "../../store/useSimulatorStore";

vi.mock("../../floorplan/pdf", () => ({ renderPdfFloorPlanPage: vi.fn() }));
vi.mock("../../floorplan/detectionClient", () => ({
  analyzeFloorPlanImage: vi.fn(),
  rawResultToCandidates: vi.fn(),
  recognizeFloorPlanLabels: vi.fn(),
}));

const { StructureToolPanel } = await import("./StructureToolPanel");

function stepHeadings() {
  return screen.getAllByText(/^[①②③] /).map((element) => element.textContent);
}

describe("StructureToolPanel", () => {
  beforeEach(() => {
    useSimulatorStore.setState({ floorPlanSources: [], activeFloorPlanSourceId: null });
  });

  it("orders sections as load → draw when no floor plan is loaded", () => {
    render(<StructureToolPanel />);
    expect(stepHeadings()).toEqual(["① 평면도 불러오기", "③ 벽·문·창문 그리기"]);
  });

  it("shows the scale step and keeps OCR collapsed once a floor plan exists", () => {
    useSimulatorStore.getState().addFloorPlanSource({
      fileName: "apt.png",
      mimeType: "image/png",
      assetId: "asset-1",
      widthPx: 1000,
      heightPx: 800,
      objectUrl: "blob:apt",
    });
    render(<StructureToolPanel />);
    expect(stepHeadings()).toEqual([
      "① 평면도 불러오기",
      "② 축척 맞추기",
      "③ 벽·문·창문 그리기",
    ]);
    expect(
      screen.getByText(
        "축척 미설정 — 평면도의 치수선 양 끝을 찍고 실제 길이를 입력하세요."
      )
    ).toBeInTheDocument();
    const ocr = screen.getByLabelText(/OCR 후보도 찾기/);
    expect(ocr).not.toBeVisible();
    const details = screen.getByText("자동 인식 (실험 기능)").closest("details")!;
    details.open = true;
    expect(ocr).toBeVisible();
  });

  it("keeps sample structures behind a collapsed section", () => {
    render(<StructureToolPanel />);
    expect(screen.getByRole("button", { name: "L자형 샘플 불러오기" })).not.toBeVisible();
    expect(screen.getByText("샘플 구조").closest("details")).not.toHaveAttribute("open");
  });

  it("loads the 84㎡ apartment sample from the sample section", () => {
    render(<StructureToolPanel />);
    fireEvent.click(
      screen.getByRole("button", { name: "84㎡ 방 3개 아파트 샘플 불러오기", hidden: true })
    );
    const structure = useSimulatorStore.getState().structure;
    expect(structure.name).toBe("84㎡ 방 3개 아파트");
    expect(structure.rooms).toHaveLength(10);
  });
});
