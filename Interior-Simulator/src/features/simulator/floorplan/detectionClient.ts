import type { FloorPlanCrop, FloorPlanSource } from "../domain/import";
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

/**
 * 분석한 이미지(자르기 영역을 width×height로 줄인 것)의 좌표를 원본 이미지 픽셀 좌표로
 * 되돌린다. 후보를 평면도 위치(mm)로 바꿀 때 원본 기준 변환을 그대로 쓰기 위해서다.
 */
export function toSourcePixels(
  result: RawDetectionResult,
  region: FloorPlanCrop,
  analyzed: { width: number; height: number },
  sourceSize: { width: number; height: number }
): RawDetectionResult {
  const scaleX = region.width / analyzed.width;
  const scaleY = region.height / analyzed.height;
  const averageScale = (scaleX + scaleY) / 2;
  const point = (value: { x: number; y: number }) => ({
    x: region.x + value.x * scaleX,
    y: region.y + value.y * scaleY,
  });
  return {
    ...result,
    width: sourceSize.width,
    height: sourceSize.height,
    lines: result.lines.map((line) => ({
      ...line,
      start: point(line.start),
      end: point(line.end),
      thicknessPx: line.thicknessPx * averageScale,
    })),
    openings: result.openings.map((opening) => ({
      ...opening,
      center: point(opening.center),
      widthPx: opening.widthPx * averageScale,
    })),
    labels: result.labels.map((label) => ({ ...label, center: point(label.center) })),
  };
}

/** 원본 이미지의 region 부분을 최대 maximumDimension 크기 캔버스에 그린다. */
function drawRegion(
  image: HTMLImageElement,
  region: FloorPlanCrop,
  maximumDimension: number
): HTMLCanvasElement {
  const scale = Math.min(1, maximumDimension / Math.max(region.width, region.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(region.width * scale));
  canvas.height = Math.max(1, Math.round(region.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이미지 분석 캔버스를 만들 수 없습니다.");
  context.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function fullRegion(image: HTMLImageElement): FloorPlanCrop {
  return { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
}

/** 평면도에서 벽·개구부 후보를 찾는다. crop이 있으면 그 영역만 분석한다. */
export async function analyzeFloorPlanImage(
  objectUrl: string,
  options: DetectionOptions,
  crop?: FloorPlanCrop
): Promise<RawDetectionResult> {
  const image = await loadImage(objectUrl);
  const region = crop ?? fullRegion(image);
  const canvas = drawRegion(image, region, 1800);
  const { width, height } = canvas;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("이미지 분석 캔버스를 만들 수 없습니다.");
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
        resolve(
          toSourcePixels(
            event.data.result as RawDetectionResult,
            region,
            { width, height },
            { width: image.naturalWidth, height: image.naturalHeight }
          )
        );
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

/** 평면도의 글자를 읽는다. crop이 있으면 그 영역만 읽고 좌표는 원본 기준으로 돌려준다. */
export async function recognizeFloorPlanLabels(
  objectUrl: string,
  onProgress?: (progress: number, status: string) => void,
  crop?: FloorPlanCrop
): Promise<RawDetectionResult["labels"]> {
  // 잘랐으면 그 영역을 원본 해상도 그대로 캔버스에 옮겨 읽는다(글자가 작아지지 않게).
  const target = crop
    ? drawRegion(await loadImage(objectUrl), crop, Number.POSITIVE_INFINITY)
    : objectUrl;
  const offset = crop ? { x: crop.x, y: crop.y } : { x: 0, y: 0 };
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
      target,
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
          x: offset.x + (line.bbox.x0 + line.bbox.x1) / 2,
          y: offset.y + (line.bbox.y0 + line.bbox.y1) / 2,
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
