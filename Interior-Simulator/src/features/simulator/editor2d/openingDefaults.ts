import type { Opening } from "../domain/structure";

export type OpeningTool = "door" | "window" | "passage";

/**
 * 구조 편집에서 벽을 클릭해 새로 다는 개구부의 기본 치수. 통로는 문짝 없는 출입구라
 * 문과 같은 높이로 바닥까지 뚫리고, 1인칭 이동에서도 지나갈 수 있다.
 */
export function defaultOpeningForTool(
  tool: OpeningTool
): Omit<Opening, "id" | "wallId" | "offset" | "source"> {
  if (tool === "window") {
    return { kind: "window", width: 1200, height: 1200, sillHeight: 900 };
  }
  if (tool === "passage") {
    return { kind: "passage", width: 1000, height: 2100, sillHeight: 0 };
  }
  return {
    kind: "door",
    width: 900,
    height: 2100,
    sillHeight: 0,
    doorType: "swing",
    hinge: "left",
    swing: "inward",
    openAngle: 90,
    thickness: 40,
  };
}
