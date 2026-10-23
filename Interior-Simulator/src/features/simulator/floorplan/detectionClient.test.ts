import { describe, expect, it } from "vitest";
import { rawResultToCandidates, toSourcePixels } from "./detectionClient";
import type { RawDetectionResult } from "./detectionTypes";
import type { FloorPlanSource } from "../domain/import";

function result(): RawDetectionResult {
  return {
    width: 400,
    height: 250,
    threshold: 128,
    estimatedSkewDegrees: 0,
    lines: [
      {
        id: "line",
        orientation: "horizontal",
        start: { x: 0, y: 10 },
        end: { x: 400, y: 10 },
        confidence: 0.9,
        thicknessPx: 4,
      },
    ],
    openings: [
      {
        id: "opening",
        orientation: "horizontal",
        center: { x: 200, y: 10 },
        widthPx: 40,
        confidence: 0.6,
        suggestedKind: "door",
      },
    ],
    labels: [{ id: "label", text: "거실", center: { x: 100, y: 125 }, confidence: 0.8 }],
    elapsedMs: 5,
  };
}

describe("toSourcePixels", () => {
  it("maps a cropped, downscaled analysis back to original image pixels", () => {
    // 원본 2000×1600 중 (300,200)부터 800×500을 잘라 400×250으로 줄여 분석했다.
    const mapped = toSourcePixels(
      result(),
      { x: 300, y: 200, width: 800, height: 500 },
      { width: 400, height: 250 },
      { width: 2000, height: 1600 }
    );
    expect(mapped.width).toBe(2000);
    expect(mapped.height).toBe(1600);
    expect(mapped.lines[0].start).toEqual({ x: 300, y: 220 });
    expect(mapped.lines[0].end).toEqual({ x: 1100, y: 220 });
    expect(mapped.lines[0].thicknessPx).toBe(8);
    expect(mapped.openings[0].center).toEqual({ x: 700, y: 220 });
    expect(mapped.openings[0].widthPx).toBe(80);
    expect(mapped.labels[0].center).toEqual({ x: 500, y: 450 });
  });

  it("keeps full-image analysis at the same scale when nothing was cropped or shrunk", () => {
    const raw = result();
    const mapped = toSourcePixels(
      raw,
      { x: 0, y: 0, width: 400, height: 250 },
      { width: 400, height: 250 },
      { width: 400, height: 250 }
    );
    expect(mapped.lines).toEqual(raw.lines);
    expect(mapped.openings).toEqual(raw.openings);
    expect(mapped.labels).toEqual(raw.labels);
  });

  it("places candidates from a cropped analysis where they are on the floor plan", () => {
    const source = {
      transform: { x: 1000, y: 0, rotation: 0, scaleMmPerPixel: 5 },
    } as FloorPlanSource;
    const mapped = toSourcePixels(
      result(),
      { x: 300, y: 200, width: 800, height: 500 },
      { width: 400, height: 250 },
      { width: 2000, height: 1600 }
    );
    const [wall] = rawResultToCandidates(mapped, source);
    expect(wall).toMatchObject({
      kind: "wall",
      start: { x: 2500, y: 1100 },
      end: { x: 6500, y: 1100 },
    });
  });
});
