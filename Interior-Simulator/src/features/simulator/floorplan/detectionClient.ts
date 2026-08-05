import type { FloorPlanSource } from "../domain/import";
import { imagePointToWorld } from "../domain/import";
import type {
  DetectionCandidate,
  RawDetectionResult,
} from "./detectionTypes";
import type { DetectionOptions } from "./detectionAlgorithm";

const UNCALIBRATED_SCALE_MM_PER_PIXEL = 10;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("분석할 평면도 이미지를 읽을 수 없습니다."));
    image.src = url;
  });
}

export async function analyzeFloorPlanImage(
  objectUrl: string,
  options: DetectionOptions
): Promise<RawDetectionResult> {
  const image = await loadImage(objectUrl);
  const maximumDimension = 1800;
  const scale = Math.min(
    1,
    maximumDimension / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이미지 분석 캔버스를 만들 수 없습니다.");
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const worker = new Worker(
    new URL("./detection.worker.ts", import.meta.url),
    { type: "module" }
  );
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("평면도 분석 시간이 초과되었습니다."));
    }, 30000);
    worker.onmessage = (event) => {
      if (event.data.id !== id) return;
      window.clearTimeout(timeout);
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else {
        const result = event.data.result as RawDetectionResult;
        const sourceScaleX = image.naturalWidth / width;
        const sourceScaleY = image.naturalHeight / height;
        resolve({
          ...result,
          width: image.naturalWidth,
          height: image.naturalHeight,
          lines: result.lines.map((line) => ({
            ...line,
            start: {
              x: line.start.x * sourceScaleX,
              y: line.start.y * sourceScaleY,
            },
            end: {
              x: line.end.x * sourceScaleX,
              y: line.end.y * sourceScaleY,
            },
            thicknessPx:
              line.thicknessPx * ((sourceScaleX + sourceScaleY) / 2),
          })),
          openings: result.openings.map((opening) => ({
            ...opening,
            center: {
              x: opening.center.x * sourceScaleX,
              y: opening.center.y * sourceScaleY,
            },
            widthPx:
              opening.widthPx * ((sourceScaleX + sourceScaleY) / 2),
          })),
        });
      }
    };
    worker.onerror = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error("평면도 분석 워커가 중단되었습니다."));
    };
    worker.postMessage(
      {
        id,
        image: {
          width,
          height,
          rgba: imageData.data,
        },
        options,
      },
      [imageData.data.buffer]
    );
  });
}

export async function recognizeFloorPlanLabels(
  objectUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<RawDetectionResult["labels"]> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker(
    ["kor", "eng"],
    Tesseract.OEM.LSTM_ONLY,
    {
      logger: (message) =>
        onProgress?.(message.progress, message.status),
    }
  );
  try {
    const result = await worker.recognize(
      objectUrl,
      {},
      { blocks: true, text: true }
    );
    const lines =
      result.data.blocks?.flatMap((block) =>
        block.paragraphs.flatMap((paragraph) => paragraph.lines)
      ) ?? [];
    return lines
      .map((line, index) => ({
        id: `label-${index + 1}`,
        text: line.text.replace(/\s+/g, " ").trim(),
        center: {
          x: (line.bbox.x0 + line.bbox.x1) / 2,
          y: (line.bbox.y0 + line.bbox.y1) / 2,
        },
        confidence: Math.max(0, Math.min(1, line.confidence / 100)),
      }))
      .filter(
        (line) =>
          line.text.length >= 2 &&
          line.text.length <= 40 &&
          line.confidence >= 0.35
      );
  } finally {
    await worker.terminate();
  }
}

export function rawResultToCandidates(
  result: RawDetectionResult,
  source: FloorPlanSource
): DetectionCandidate[] {
  const transform = {
    ...source.transform,
    scaleMmPerPixel:
      source.transform.scaleMmPerPixel ?? UNCALIBRATED_SCALE_MM_PER_PIXEL,
  };
  const scale = transform.scaleMmPerPixel;
  const walls: DetectionCandidate[] = result.lines.map((line) => ({
    id: `candidate-${line.id}`,
    kind: "wall",
    start: imagePointToWorld(line.start, transform),
    end: imagePointToWorld(line.end, transform),
    thickness: Math.max(80, Math.min(320, line.thicknessPx * scale)),
    confidence: line.confidence,
    status: "pending",
  }));
  const openings: DetectionCandidate[] = result.openings.map((opening) => ({
    id: `candidate-${opening.id}`,
    kind: "opening",
    position: imagePointToWorld(opening.center, transform),
    width: Math.max(600, Math.min(2400, opening.widthPx * scale)),
    suggestedKind: opening.suggestedKind,
    confidence: opening.confidence,
    status: "pending",
  }));
  const labels: DetectionCandidate[] = result.labels.map((label) => ({
    id: `candidate-${label.id}`,
    kind: "label",
    position: imagePointToWorld(label.center, transform),
    text: label.text,
    confidence: label.confidence,
    status: "pending",
  }));
  return [...walls, ...openings, ...labels];
}
