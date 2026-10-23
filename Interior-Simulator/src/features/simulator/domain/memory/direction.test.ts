import { describe, expect, it } from "vitest";
import {
  CAMERA_FOV_DEGREES,
  cameraDirectionVector,
  cameraWedgeRotation,
  showsCameraDirection,
} from "./direction";
import type { MemoryPin } from "./types";

function expectVector(actual: { x: number; y: number }, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x, 9);
  expect(actual.y).toBeCloseTo(y, 9);
}

describe("camera direction", () => {
  it("uses compass degrees on the plan: 0° up, 90° right, 180° down, 270° left", () => {
    expectVector(cameraDirectionVector(0), 0, -1);
    expectVector(cameraDirectionVector(90), 1, 0);
    expectVector(cameraDirectionVector(180), 0, 1);
    expectVector(cameraDirectionVector(270), -1, 0);
  });

  it("centers the 2D wedge on the photo direction", () => {
    // Konva 각도는 +x에서 시계 방향(화면 y 아래)이다. 0°(위)는 -90°가 가운데다.
    expect(cameraWedgeRotation(0)).toBeCloseTo(-90 - CAMERA_FOV_DEGREES / 2, 9);
    expect(cameraWedgeRotation(90)).toBeCloseTo(0 - CAMERA_FOV_DEGREES / 2, 9);
    expect(cameraWedgeRotation(180)).toBeCloseTo(90 - CAMERA_FOV_DEGREES / 2, 9);
  });

  it("draws the direction only for pins with photos or the selected pin", () => {
    const pin = { assetIds: [] } as unknown as MemoryPin;
    expect(showsCameraDirection(pin, false)).toBe(false);
    expect(showsCameraDirection(pin, true)).toBe(true);
    expect(showsCameraDirection({ ...pin, assetIds: ["photo"] }, false)).toBe(true);
  });
});
