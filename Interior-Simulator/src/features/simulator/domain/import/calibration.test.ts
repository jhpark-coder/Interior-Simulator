import { describe, expect, it } from "vitest";
import {
  averageCalibrationScale,
  calculateScaleMmPerPixel,
  imagePointToWorld,
  worldPointToImage,
} from "./calibration";

describe("floor plan calibration", () => {
  const anchor = {
    id: "anchor-1",
    startPixel: { x: 10, y: 20 },
    endPixel: { x: 210, y: 20 },
    realLengthMm: 5000,
  };

  it("calculates millimeters per pixel from a known distance", () => {
    expect(calculateScaleMmPerPixel(anchor)).toBe(25);
  });

  it("averages multiple calibration anchors", () => {
    expect(
      averageCalibrationScale([
        anchor,
        {
          ...anchor,
          id: "anchor-2",
          endPixel: { x: 110, y: 20 },
          realLengthMm: 3000,
        },
      ])
    ).toBe(27.5);
  });

  it("converts image and world coordinates reversibly", () => {
    const transform = {
      x: 1000,
      y: -500,
      rotation: 90,
      scaleMmPerPixel: 20,
    };
    const world = imagePointToWorld({ x: 100, y: 50 }, transform);
    expect(world.x).toBeCloseTo(0);
    expect(world.y).toBeCloseTo(1500);
    const image = worldPointToImage(world, transform);
    expect(image.x).toBeCloseTo(100);
    expect(image.y).toBeCloseTo(50);
  });

  it("requires a calibrated scale", () => {
    expect(() =>
      imagePointToWorld(
        { x: 10, y: 10 },
        { x: 0, y: 0, rotation: 0, scaleMmPerPixel: null }
      )
    ).toThrow("축척");
  });
});
