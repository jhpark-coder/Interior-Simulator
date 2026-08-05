import type {
  RawDetectedLine,
  RawDetectedOpening,
  RawDetectionResult,
} from "./detectionTypes";

export type DetectionImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export type DetectionOptions = {
  threshold?: number | null;
  minLineLengthPx?: number;
  mergeDistancePx?: number;
};

type Run = {
  orientation: "horizontal" | "vertical";
  coordinate: number;
  start: number;
  end: number;
  fill: number;
};

function grayscale(image: DetectionImage): Uint8Array {
  const result = new Uint8Array(image.width * image.height);
  for (let index = 0; index < result.length; index += 1) {
    const offset = index * 4;
    result[index] = Math.round(
      image.rgba[offset] * 0.299 +
        image.rgba[offset + 1] * 0.587 +
        image.rgba[offset + 2] * 0.114
    );
  }
  return result;
}

export function otsuThreshold(gray: Uint8Array): number {
  const histogram = new Uint32Array(256);
  gray.forEach((value) => {
    histogram[value] += 1;
  });
  const total = gray.length;
  let totalWeighted = 0;
  histogram.forEach((count, value) => {
    totalWeighted += value * count;
  });
  let backgroundCount = 0;
  let backgroundWeighted = 0;
  let bestVariance = -1;
  let bestThreshold = 127;
  for (let value = 0; value < 256; value += 1) {
    backgroundCount += histogram[value];
    if (backgroundCount === 0) continue;
    const foregroundCount = total - backgroundCount;
    if (foregroundCount === 0) break;
    backgroundWeighted += value * histogram[value];
    const backgroundMean = backgroundWeighted / backgroundCount;
    const foregroundMean =
      (totalWeighted - backgroundWeighted) / foregroundCount;
    const variance =
      backgroundCount *
      foregroundCount *
      (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = value;
    }
  }
  return Math.max(35, Math.min(220, bestThreshold));
}

function binaryFromGray(gray: Uint8Array, threshold: number): Uint8Array {
  const binary = new Uint8Array(gray.length);
  for (let index = 0; index < gray.length; index += 1) {
    binary[index] = gray[index] <= threshold ? 1 : 0;
  }
  return binary;
}

function denoise(binary: Uint8Array, width: number, height: number): Uint8Array {
  const result = binary.slice();
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!binary[index]) continue;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          neighbors += binary[(y + dy) * width + x + dx];
        }
      }
      if (neighbors <= 1) result[index] = 0;
    }
  }
  return result;
}

function collectRuns(
  binary: Uint8Array,
  width: number,
  height: number,
  minimumLength: number
): Run[] {
  const runs: Run[] = [];
  const scan = (
    orientation: Run["orientation"],
    coordinate: number,
    length: number,
    darkAt: (position: number) => number
  ) => {
    let start = -1;
    let darkCount = 0;
    let gap = 0;
    for (let position = 0; position <= length; position += 1) {
      const dark = position < length ? darkAt(position) : 0;
      if (dark) {
        if (start < 0) start = position;
        darkCount += 1;
        gap = 0;
      } else if (start >= 0) {
        gap += 1;
        if (gap <= 2 && position < length) continue;
        const end = position - gap + 1;
        const span = end - start;
        if (span >= minimumLength) {
          runs.push({
            orientation,
            coordinate,
            start,
            end,
            fill: darkCount / Math.max(1, span),
          });
        }
        start = -1;
        darkCount = 0;
        gap = 0;
      }
    }
  };

  for (let y = 0; y < height; y += 1) {
    scan("horizontal", y, width, (x) => binary[y * width + x]);
  }
  for (let x = 0; x < width; x += 1) {
    scan("vertical", x, height, (y) => binary[y * width + x]);
  }
  return runs;
}

function overlapRatio(a: Run, b: Run): number {
  const overlap = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  return overlap / Math.max(1, Math.min(a.end - a.start, b.end - b.start));
}

function clusterRuns(runs: Run[], mergeDistance: number): RawDetectedLine[] {
  const remaining = [...runs].sort(
    (a, b) =>
      a.orientation.localeCompare(b.orientation) ||
      a.coordinate - b.coordinate ||
      a.start - b.start
  );
  const result: RawDetectedLine[] = [];
  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const cluster = [seed];
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index];
      if (
        candidate.orientation === seed.orientation &&
        Math.abs(candidate.coordinate - seed.coordinate) <= mergeDistance &&
        overlapRatio(candidate, seed) >= 0.55
      ) {
        cluster.push(candidate);
        remaining.splice(index, 1);
      }
    }
    const coordinate =
      cluster.reduce((sum, run) => sum + run.coordinate, 0) / cluster.length;
    const start = Math.min(...cluster.map((run) => run.start));
    const end = Math.max(...cluster.map((run) => run.end));
    const length = end - start;
    const confidence = Math.min(
      0.99,
      0.42 +
        cluster.length * 0.045 +
        cluster.reduce((sum, run) => sum + run.fill, 0) /
          cluster.length *
          0.28 +
        Math.min(0.2, length / 1200)
    );
    result.push({
      id: `line-${result.length + 1}`,
      orientation: seed.orientation,
      start:
        seed.orientation === "horizontal"
          ? { x: start, y: coordinate }
          : { x: coordinate, y: start },
      end:
        seed.orientation === "horizontal"
          ? { x: end, y: coordinate }
          : { x: coordinate, y: end },
      confidence,
      thicknessPx: cluster.length,
    });
  }
  return result;
}

function detectOpenings(
  lines: RawDetectedLine[],
  minimumGap: number,
  maximumGap: number
): RawDetectedOpening[] {
  const openings: RawDetectedOpening[] = [];
  for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < lines.length;
      rightIndex += 1
    ) {
      const left = lines[leftIndex];
      const right = lines[rightIndex];
      if (left.orientation !== right.orientation) continue;
      const leftCoordinate =
        left.orientation === "horizontal" ? left.start.y : left.start.x;
      const rightCoordinate =
        right.orientation === "horizontal" ? right.start.y : right.start.x;
      if (Math.abs(leftCoordinate - rightCoordinate) > 5) continue;
      const leftEnd =
        left.orientation === "horizontal" ? left.end.x : left.end.y;
      const rightStart =
        right.orientation === "horizontal" ? right.start.x : right.start.y;
      const reverseEnd =
        right.orientation === "horizontal" ? right.end.x : right.end.y;
      const reverseStart =
        left.orientation === "horizontal" ? left.start.x : left.start.y;
      const first = leftEnd <= rightStart ? left : right;
      const second = first === left ? right : left;
      const firstEnd =
        first.orientation === "horizontal" ? first.end.x : first.end.y;
      const secondStart =
        second.orientation === "horizontal" ? second.start.x : second.start.y;
      const gap = secondStart - firstEnd;
      if (gap < minimumGap || gap > maximumGap) continue;
      if (reverseEnd < reverseStart) continue;
      const coordinate = (leftCoordinate + rightCoordinate) / 2;
      const centerPosition = firstEnd + gap / 2;
      openings.push({
        id: `opening-${openings.length + 1}`,
        orientation: first.orientation,
        center:
          first.orientation === "horizontal"
            ? { x: centerPosition, y: coordinate }
            : { x: coordinate, y: centerPosition },
        widthPx: gap,
        confidence: Math.min(
          0.88,
          (left.confidence + right.confidence) / 2 - 0.08
        ),
        suggestedKind: gap > maximumGap * 0.58 ? "door" : "window",
      });
    }
  }
  return openings;
}

function estimateSkew(binary: Uint8Array, width: number, height: number): number {
  const points: Array<{ x: number; y: number }> = [];
  const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 8000)));
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (binary[y * width + x]) points.push({ x, y });
    }
  }
  if (points.length < 20) return 0;
  let bestAngle = 0;
  let bestScore = -Infinity;
  for (let angle = -5; angle <= 5; angle += 0.5) {
    const radians = (angle * Math.PI) / 180;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const rows = new Map<number, number>();
    const columns = new Map<number, number>();
    points.forEach((point) => {
      const rotatedX = Math.round(point.x * cos - point.y * sin);
      const rotatedY = Math.round(point.x * sin + point.y * cos);
      rows.set(rotatedY, (rows.get(rotatedY) ?? 0) + 1);
      columns.set(rotatedX, (columns.get(rotatedX) ?? 0) + 1);
    });
    const score =
      [...rows.values(), ...columns.values()].reduce(
        (sum, count) => sum + count * count,
        0
      ) -
      Math.abs(angle) * 0.01;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }
  return bestAngle;
}

export function analyzeFloorPlanPixels(
  image: DetectionImage,
  options: DetectionOptions = {}
): RawDetectionResult {
  const startedAt = performance.now();
  const gray = grayscale(image);
  const threshold = options.threshold ?? otsuThreshold(gray);
  const binary = denoise(
    binaryFromGray(gray, threshold),
    image.width,
    image.height
  );
  const minimumLength =
    options.minLineLengthPx ??
    Math.max(18, Math.round(Math.min(image.width, image.height) * 0.12));
  const runs = collectRuns(
    binary,
    image.width,
    image.height,
    minimumLength
  );
  const adaptiveMergeDistance = Math.max(
    8,
    Math.min(32, Math.round(Math.min(image.width, image.height) * 0.025))
  );
  const lines = clusterRuns(
    runs,
    options.mergeDistancePx ?? adaptiveMergeDistance
  ).filter(
    (line) =>
      Math.hypot(
        line.end.x - line.start.x,
        line.end.y - line.start.y
      ) >= minimumLength
  );
  const openings = detectOpenings(
    lines,
    Math.max(5, Math.round(minimumLength * 0.12)),
    Math.max(32, Math.round(minimumLength * 1.25))
  );
  return {
    width: image.width,
    height: image.height,
    threshold,
    estimatedSkewDegrees: estimateSkew(binary, image.width, image.height),
    lines,
    openings,
    labels: [],
    elapsedMs: performance.now() - startedAt,
  };
}
