import { describe, expect, it } from "vitest";
import { analyzeFloorPlanPixels, otsuThreshold } from "./detectionAlgorithm";

function image(width = 220, height = 170, background = 248) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    rgba[offset] = background;
    rgba[offset + 1] = background;
    rgba[offset + 2] = background;
    rgba[offset + 3] = 255;
  }
  const paint = (x: number, y: number, shade = 20) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    rgba[offset] = shade;
    rgba[offset + 1] = shade;
    rgba[offset + 2] = shade;
  };
  const line = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    thickness = 4
  ) => {
    if (startY === endY) {
      for (let y = startY; y < startY + thickness; y += 1) {
        for (let x = startX; x <= endX; x += 1) paint(x, y);
      }
    } else {
      for (let x = startX; x < startX + thickness; x += 1) {
        for (let y = startY; y <= endY; y += 1) paint(x, y);
      }
    }
  };
  return { width, height, rgba, paint, line };
}

function rectangleFixture(seed: number) {
  const fixture = image(220, 170, 240 + (seed % 3) * 4);
  const inset = 15 + seed;
  fixture.line(inset, inset, 205 - seed, inset, 3 + (seed % 4));
  fixture.line(
    205 - seed,
    inset,
    205 - seed,
    155 - seed,
    3 + (seed % 4)
  );
  fixture.line(
    inset,
    155 - seed,
    205 - seed,
    155 - seed,
    3 + (seed % 4)
  );
  fixture.line(inset, inset, inset, 155 - seed, 3 + (seed % 4));
  for (let noise = 0; noise < seed * 3; noise += 1) {
    fixture.paint((noise * 37) % 220, (noise * 53) % 170, 70);
  }
  return fixture;
}

describe("floor plan detection algorithm", () => {
  it("calculates an adaptive threshold", () => {
    const values = new Uint8Array([10, 12, 15, 220, 230, 245]);
    expect(otsuThreshold(values)).toBeGreaterThanOrEqual(35);
    expect(otsuThreshold(values)).toBeLessThan(220);
  });

  it("extracts the main wall lines from ten supported synthetic samples", () => {
    const results = Array.from({ length: 10 }, (_, index) =>
      analyzeFloorPlanPixels(rectangleFixture(index + 1), {
        minLineLengthPx: 45,
      })
    );
    results.forEach((result) => {
      expect(result.lines.length).toBeGreaterThanOrEqual(4);
      expect(
        result.lines.filter((line) => line.confidence >= 0.55).length
      ).toBeGreaterThanOrEqual(4);
      expect(Math.abs(result.estimatedSkewDegrees)).toBeLessThanOrEqual(1);
    });
  });

  it("suggests an opening for a collinear wall gap", () => {
    const fixture = image();
    fixture.line(15, 35, 92, 35, 5);
    fixture.line(112, 35, 205, 35, 5);
    fixture.line(15, 35, 15, 150, 5);
    fixture.line(205, 35, 205, 150, 5);
    fixture.line(15, 150, 205, 150, 5);
    const result = analyzeFloorPlanPixels(fixture, {
      minLineLengthPx: 40,
    });
    expect(result.openings.length).toBeGreaterThanOrEqual(1);
    expect(result.openings[0].confidence).toBeGreaterThan(0.4);
  });
});
