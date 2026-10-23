import { describe, expect, it } from "vitest";
import { MIN_CROP_SIZE_PX, clampCrop, cropFromCorners, visibleImageRect } from "./crop";

describe("floor plan crop", () => {
  it("builds the same rectangle whichever corner is clicked first", () => {
    const expected = { x: 100, y: 50, width: 700, height: 500 };
    expect(cropFromCorners({ x: 100, y: 50 }, { x: 800, y: 550 }, 1000, 800)).toEqual(expected);
    expect(cropFromCorners({ x: 800, y: 550 }, { x: 100, y: 50 }, 1000, 800)).toEqual(expected);
    expect(cropFromCorners({ x: 100, y: 550 }, { x: 800, y: 50 }, 1000, 800)).toEqual(expected);
  });

  it("expands to whole pixels so the clicked area stays inside", () => {
    expect(cropFromCorners({ x: 10.6, y: 20.2 }, { x: 99.1, y: 120.9 }, 1000, 800)).toEqual({
      x: 10,
      y: 20,
      width: 90,
      height: 101,
    });
  });

  it("clips corners outside the image", () => {
    expect(cropFromCorners({ x: -300, y: -40 }, { x: 1500, y: 300 }, 1000, 800)).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 300,
    });
  });

  it("rejects areas that are too small or entirely outside the image", () => {
    expect(
      cropFromCorners({ x: 10, y: 10 }, { x: 10 + MIN_CROP_SIZE_PX - 1, y: 500 }, 1000, 800)
    ).toBeNull();
    expect(cropFromCorners({ x: 10, y: 10 }, { x: 500, y: 10 }, 1000, 800)).toBeNull();
    expect(cropFromCorners({ x: 1200, y: 10 }, { x: 1500, y: 500 }, 1000, 800)).toBeNull();
    expect(
      cropFromCorners(
        { x: 10, y: 10 },
        { x: 10 + MIN_CROP_SIZE_PX, y: 10 + MIN_CROP_SIZE_PX },
        1000,
        800
      )
    ).not.toBeNull();
  });

  it("clamps a stored crop into a smaller image or drops it", () => {
    const crop = { x: 600, y: 100, width: 600, height: 200 };
    expect(clampCrop(crop, 1000, 800)).toEqual({ x: 600, y: 100, width: 400, height: 200 });
    expect(clampCrop(crop, 610, 800)).toBeNull();
  });

  it("uses the whole image when there is no crop", () => {
    expect(visibleImageRect({ widthPx: 1000, heightPx: 800 })).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
    });
    const crop = { x: 1, y: 2, width: 30, height: 40 };
    expect(visibleImageRect({ widthPx: 1000, heightPx: 800, crop })).toBe(crop);
  });
});
