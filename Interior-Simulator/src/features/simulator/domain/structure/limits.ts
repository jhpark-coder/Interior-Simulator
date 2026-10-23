// 프로젝트 스키마(Zod)가 받아들이는 벽·개구부 수치 범위. 편집 중 이 범위를 벗어난 값이
// 저장되면 다음에 열 때 검증에 실패해 프로젝트가 복원되지 않으므로 store와 입력칸이
// 같은 값을 쓴다.
export const WALL_THICKNESS_RANGE = { min: 20, max: 2000 } as const;
export const WALL_HEIGHT_RANGE = { min: 100, max: 20000 } as const;
export const CEILING_HEIGHT_RANGE = { min: 1000, max: 20000 } as const;
export const OPENING_MIN_SIZE = 100;
export const OPENING_ANGLE_RANGE = { min: 0, max: 180 } as const;

export function clampToRange(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, value));
}
