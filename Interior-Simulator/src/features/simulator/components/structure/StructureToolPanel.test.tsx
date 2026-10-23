import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSimulatorStore } from "../../store/useSimulatorStore";

vi.mock("../../floorplan/pdf", () => ({ renderPdfFloorPlanPage: vi.fn() }));
vi.mock("../../floorplan/detectionClient", () => ({
  analyzeFloorPlanImage: vi.fn(),
  rawResultToCandidates: vi.fn(),
  recognizeFloorPlanLabels: vi.fn(),
}));

const { StructureToolPanel } = await import("./StructureToolPanel");
const detection = await import("../../floorplan/detectionClient");

function addSource() {
  useSimulatorStore.getState().addFloorPlanSource({
    fileName: "apt.png",
    mimeType: "image/png",
    assetId: "asset-1",
    widthPx: 1000,
    heightPx: 800,
    objectUrl: "blob:apt",
  });
  return useSimulatorStore.getState().floorPlanSources[0];
}

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

  it("starts and clears a floor plan crop", async () => {
    const source = addSource();
    render(<StructureToolPanel />);
    expect(screen.getByText("자르기: 이미지 전체 사용")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "자르기 해제" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "영역 자르기" }));
    expect(useSimulatorStore.getState().structureTool).toBe("crop");
    fireEvent.click(screen.getByRole("button", { name: "자르기 취소" }));
    expect(useSimulatorStore.getState().structureTool).toBe("select");

    useSimulatorStore
      .getState()
      .updateFloorPlanSource(source.id, { crop: { x: 100, y: 50, width: 600, height: 400 } });
    expect(await screen.findByText("자르기: 600×400px 영역 사용")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "자르기 해제" }));
    expect(useSimulatorStore.getState().floorPlanSources[0].crop).toBeUndefined();
    expect(screen.getByText("자르기: 이미지 전체 사용")).toBeInTheDocument();
  });

  it("analyzes only the cropped area", async () => {
    const source = addSource();
    const crop = { x: 100, y: 50, width: 600, height: 400 };
    useSimulatorStore.getState().updateFloorPlanSource(source.id, { crop });
    vi.mocked(detection.analyzeFloorPlanImage).mockResolvedValue({
      width: 1000,
      height: 800,
      threshold: 128,
      estimatedSkewDegrees: 0,
      lines: [],
      openings: [],
      labels: [],
      elapsedMs: 1,
    });
    vi.mocked(detection.rawResultToCandidates).mockReturnValue([]);
    render(<StructureToolPanel />);
    fireEvent.click(screen.getByRole("button", { name: "벽·문·텍스트 후보 분석", hidden: true }));
    await waitFor(() =>
      expect(detection.analyzeFloorPlanImage).toHaveBeenCalledWith("blob:apt", expect.anything(), crop)
    );
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
