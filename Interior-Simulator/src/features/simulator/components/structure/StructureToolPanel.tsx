import { useRef, useState } from "react";
import {
  createLShapedStructureFixture,
  createThreeRoomStructureFixture,
} from "../../domain/structure";
import type { FloorPlanMimeType } from "../../domain/import";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import type { StructureTool } from "../../store/slices/workspaceSlice";
import {
  deleteProjectAsset,
  saveProjectAsset,
} from "../../store/persistence/projectDb";
import { renderPdfFloorPlanPage } from "../../floorplan/pdf";
import {
  analyzeFloorPlanImage,
  rawResultToCandidates,
  recognizeFloorPlanLabels,
} from "../../floorplan/detectionClient";
import "./StructureWorkspace.css";

const TOOLS: Array<{ id: StructureTool; icon: string; label: string }> = [
  { id: "select", icon: "↖", label: "선택" },
  { id: "pan", icon: "✋", label: "이동" },
  { id: "wall", icon: "╱", label: "벽" },
  { id: "door", icon: "🚪", label: "문" },
  { id: "window", icon: "▣", label: "창문" },
  { id: "calibrate", icon: "📏", label: "축척" },
];

function loadImage(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    image.src = objectUrl;
  });
}

export function StructureToolPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [useOcr, setUseOcr] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState("");
  const tool = useSimulatorStore((state) => state.structureTool);
  const setTool = useSimulatorStore((state) => state.setStructureTool);
  const sources = useSimulatorStore((state) => state.floorPlanSources);
  const activeSourceId = useSimulatorStore(
    (state) => state.activeFloorPlanSourceId
  );
  const objectUrls = useSimulatorStore((state) => state.floorPlanObjectUrls);
  const addSource = useSimulatorStore((state) => state.addFloorPlanSource);
  const updateSource = useSimulatorStore(
    (state) => state.updateFloorPlanSource
  );
  const removeSource = useSimulatorStore(
    (state) => state.removeFloorPlanSource
  );
  const setActiveSource = useSimulatorStore(
    (state) => state.setActiveFloorPlanSource
  );
  const clearCalibration = useSimulatorStore(
    (state) => state.clearCalibration
  );
  const clearStructure = useSimulatorStore((state) => state.clearStructure);
  const setStructure = useSimulatorStore((state) => state.setStructure);
  const projectId = useSimulatorStore((state) => state.projectId);
  const registerAsset = useSimulatorStore(
    (state) => state.registerProjectAsset
  );
  const unregisterAsset = useSimulatorStore(
    (state) => state.unregisterProjectAsset
  );
  const detectionStatus = useSimulatorStore(
    (state) => state.detectionStatus
  );
  const beginDetection = useSimulatorStore(
    (state) => state.beginDetection
  );
  const setDetectionResult = useSimulatorStore(
    (state) => state.setDetectionResult
  );
  const failDetection = useSimulatorStore(
    (state) => state.failDetection
  );

  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? null;

  const handleFile = async (file: File) => {
    if (
      file.type !== "image/jpeg" &&
      file.type !== "image/png" &&
      file.type !== "application/pdf"
    ) {
      window.alert("JPG, PNG 또는 PDF 평면도만 불러올 수 있습니다.");
      return;
    }

    if (file.type === "application/pdf") {
      try {
        const originalAssetId = `floorplan-pdf-${Date.now()}-${file.size}`;
        await saveProjectAsset(projectId, originalAssetId, file);
        registerAsset({
          id: originalAssetId,
          kind: "floorplan",
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          createdAt: new Date().toISOString(),
        });

        let rendered = await renderPdfFloorPlanPage(file, 1);
        if (rendered.pageCount > 1) {
          const entered = window.prompt(
            `PDF가 ${rendered.pageCount}페이지입니다. 평면도가 있는 페이지 번호를 입력하세요.`,
            "1"
          );
          const requestedPage = Number(entered);
          if (entered && Number.isFinite(requestedPage)) {
            rendered = await renderPdfFloorPlanPage(file, requestedPage);
          }
        }
        const renderedAssetId = `floorplan-page-${Date.now()}-${rendered.pageNumber}`;
        await saveProjectAsset(projectId, renderedAssetId, rendered.blob);
        registerAsset({
          id: renderedAssetId,
          kind: "floorplan",
          fileName: `${file.name}-${rendered.pageNumber}.png`,
          mimeType: "image/png",
          size: rendered.blob.size,
          createdAt: new Date().toISOString(),
        });
        const objectUrl = URL.createObjectURL(rendered.blob);
        addSource({
          fileName: file.name,
          mimeType: file.type,
          assetId: renderedAssetId,
          originalAssetId,
          pageNumber: rendered.pageNumber,
          widthPx: rendered.widthPx,
          heightPx: rendered.heightPx,
          objectUrl,
        });
      } catch (error) {
        window.alert(
          error instanceof Error ? error.message : "PDF 평면도를 불러오지 못했습니다."
        );
      }
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      const assetId = `floorplan-${Date.now()}-${file.size}`;
      await saveProjectAsset(projectId, assetId, file);
      registerAsset({
        id: assetId,
        kind: "floorplan",
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString(),
      });
      addSource({
        fileName: file.name,
        mimeType: file.type as FloorPlanMimeType,
        assetId,
        widthPx: image.naturalWidth,
        heightPx: image.naturalHeight,
        objectUrl,
      });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      window.alert(error instanceof Error ? error.message : "평면도를 불러오지 못했습니다.");
    }
  };

  const handleDetection = async () => {
    if (!activeSource) return;
    const objectUrl = objectUrls[activeSource.assetId];
    if (!objectUrl) {
      failDetection("분석할 평면도 원본을 불러오지 못했습니다.");
      return;
    }
    beginDetection();
    setDetectionProgress("벽 선분을 찾는 중");
    try {
      let result = await analyzeFloorPlanImage(objectUrl, {
        threshold: activeSource.adjustments.threshold,
      });
      if (useOcr) {
        setDetectionProgress("OCR 언어 모델 준비 중");
        const labels = await recognizeFloorPlanLabels(
          objectUrl,
          (progress, status) =>
            setDetectionProgress(
              `${status} ${Math.round(progress * 100)}%`
            )
        );
        result = { ...result, labels };
      }
      const candidates = rawResultToCandidates(result, activeSource);
      setDetectionResult(candidates, {
        sourceId: activeSource.id,
        elapsedMs: result.elapsedMs,
        threshold: result.threshold,
        estimatedSkewDegrees: result.estimatedSkewDegrees,
        wallCandidateCount: result.lines.length,
        openingCandidateCount: result.openings.length,
        labelCandidateCount: result.labels.length,
        calibrated: activeSource.transform.scaleMmPerPixel !== null,
      });
      setDetectionProgress("");
    } catch (error) {
      failDetection(
        error instanceof Error
          ? error.message
          : "평면도 자동 인식에 실패했습니다."
      );
      setDetectionProgress("");
    }
  };

  return (
    <div className="structure-tool-panel">
      <div>
        <p className="panel-kicker">Floor plan workspace</p>
        <h2 className="panel-title">집 구조 만들기</h2>
        <p className="panel-subtitle">
          평면도를 겹쳐 놓고 벽·문·창문을 보정합니다.
        </p>
      </div>

      <div className="structure-tool-grid" aria-label="구조 편집 도구">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            className={tool === item.id ? "structure-tool active" : "structure-tool"}
            onClick={() => setTool(item.id)}
            title={item.label}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <section className="structure-section">
        <div className="structure-section-heading">
          <strong>원본 평면도</strong>
          <button className="structure-link-button" onClick={() => inputRef.current?.click()}>
            불러오기
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />

        {sources.length === 0 ? (
          <button
            className="floorplan-empty"
            onClick={() => inputRef.current?.click()}
          >
            JPG·PNG 평면도를 여기에 추가하세요
          </button>
        ) : (
          <select
            className="structure-select"
            value={activeSourceId ?? ""}
            onChange={(event) => setActiveSource(event.target.value)}
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.fileName}
              </option>
            ))}
          </select>
        )}

        {activeSource && (
          <div className="structure-control-stack">
            <label>
              투명도 {Math.round(activeSource.opacity * 100)}%
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={activeSource.opacity}
                onChange={(event) =>
                  updateSource(activeSource.id, {
                    opacity: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              회전
              <input
                type="number"
                value={activeSource.transform.rotation}
                onChange={(event) =>
                  updateSource(activeSource.id, {
                    transform: {
                      ...activeSource.transform,
                      rotation: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <div className="structure-inline-actions">
              <button
                onClick={() =>
                  updateSource(activeSource.id, {
                    visible: !activeSource.visible,
                  })
                }
              >
                {activeSource.visible ? "숨기기" : "보이기"}
              </button>
              <button
                onClick={() =>
                  updateSource(activeSource.id, {
                    locked: !activeSource.locked,
                  })
                }
              >
                {activeSource.locked ? "잠금 해제" : "잠금"}
              </button>
            </div>
            <div className="floorplan-scale-state">
              {activeSource.transform.scaleMmPerPixel
                ? `축척: ${activeSource.transform.scaleMmPerPixel.toFixed(3)} mm/px`
                : "축척 미설정 — 축척 도구로 치수선 두 점을 지정하세요."}
            </div>
            <div className="structure-inline-actions">
              <button onClick={() => setTool("calibrate")}>축척 다시 측정</button>
              <button onClick={() => clearCalibration(activeSource.id)}>
                축척 초기화
              </button>
            </div>
            <div className="detection-launch">
              <label>
                인식 임계값
                <input
                  type="number"
                  min={0}
                  max={255}
                  placeholder="자동"
                  value={activeSource.adjustments.threshold ?? ""}
                  onChange={(event) =>
                    updateSource(activeSource.id, {
                      adjustments: {
                        ...activeSource.adjustments,
                        threshold:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      },
                    })
                  }
                />
              </label>
              <label className="detection-checkbox">
                <input
                  type="checkbox"
                  checked={useOcr}
                  onChange={(event) => setUseOcr(event.target.checked)}
                />
                방 이름·치수 OCR 후보도 찾기
              </label>
              {useOcr && (
                <p>
                  OCR은 브라우저에서 처리합니다. 최초 실행 시 한국어 언어
                  데이터가 인터넷에서 내려받아지지만 평면도 이미지는
                  전송하지 않습니다.
                </p>
              )}
              <button
                className="detection-run"
                disabled={detectionStatus === "analyzing"}
                onClick={() => void handleDetection()}
              >
                {detectionStatus === "analyzing"
                  ? detectionProgress || "평면도 분석 중…"
                  : "벽·문·텍스트 후보 분석"}
              </button>
            </div>
            <button
              className="structure-danger"
              onClick={() => {
                const objectUrl = objectUrls[activeSource.assetId];
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                void deleteProjectAsset(projectId, activeSource.assetId);
                unregisterAsset(activeSource.assetId);
                if (activeSource.originalAssetId) {
                  void deleteProjectAsset(
                    projectId,
                    activeSource.originalAssetId
                  );
                  unregisterAsset(activeSource.originalAssetId);
                }
                removeSource(activeSource.id);
              }}
            >
              평면도 제거
            </button>
          </div>
        )}
      </section>

      <section className="structure-section">
        <strong>구조 시작점</strong>
        <div className="structure-control-stack">
          <button
            onClick={() => {
              clearStructure();
              setTool("wall");
            }}
          >
            빈 구조에서 시작
          </button>
          <button onClick={() => setStructure(createLShapedStructureFixture())}>
            L자형 샘플 불러오기
          </button>
          <button
            onClick={() => setStructure(createThreeRoomStructureFixture())}
          >
            방 3개 샘플 불러오기
          </button>
        </div>
      </section>
    </div>
  );
}
